/**
 * Change Request REST Controller
 * Handles employee-submitted change requests for sensitive profile fields.
 * Critical fields (bank details, name) go through HR approval before being applied.
 *
 * REDESIGNED: Now supports multiple fields per request with individual field-level approval.
 *
 * Routes:
 *   POST   /api/change-requests                     → createChangeRequest       (employee)
 *   GET    /api/change-requests/my                  → getMyChangeRequests       (employee)
 *   GET    /api/change-requests                     → getAllChangeRequests      (HR/admin)
 *   PATCH  /api/change-requests/:id/approve         → approveChangeRequest      (HR/admin) - approves all pending fields
 *   PATCH  /api/change-requests/:id/reject          → rejectChangeRequest       (HR/admin) - rejects all pending fields
 *   PATCH  /api/change-requests/:id/field/:fieldIdx/approve → approveField      (HR/admin)
 *   PATCH  /api/change-requests/:id/field/:fieldIdx/reject  → rejectField       (HR/admin)
 *   PATCH  /api/change-requests/:id/cancel          → cancelChangeRequest       (employee/HR)
 *   PATCH  /api/change-requests/:id/bulk-approve    → bulkApproveFields        (HR/admin)
 *   PATCH  /api/change-requests/:id/bulk-reject     → bulkRejectFields         (HR/admin)
 */

import { ObjectId } from 'mongodb';
import { getTenantCollections } from '../../config/db.js';
import {
    asyncHandler,
    buildForbiddenError,
    buildNotFoundError,
    buildValidationError,
} from '../../middleware/errorHandler.js';
import {
    buildChangeRequestDocument,
    updateRequestStatus
} from '../../models/changeRequest/changeRequest.schema.js';
import {
    buildPagination,
    extractUser,
    sendCreated,
    sendSuccess,
} from '../../utils/apiResponse.js';
import logger from '../../utils/logger.js';

// Fields that are allowed to be changed via change request
const ALLOWED_CHANGE_FIELDS = {
  bankDetails: [
    'bankDetails', // Allow entire bankDetails object for complete bank account changes
    'bankDetails.accountHolderName',
    'bankDetails.bankName',
    'bankDetails.accountNumber',
    'bankDetails.ifscCode',
    'bankDetails.branch',
    'bankDetails.accountType',
  ],
  name: ['firstName', 'lastName'],
  phone: ['phone'],
  address: [
    'address', // Allow entire address object for complete address changes
    'address.street',
    'address.city',
    'address.state',
    'address.country',
    'address.postalCode',
  ],
  emergencyContact: [
    'emergencyContact', // Allow entire emergencyContact object for complete contact changes
    'emergencyContact.name',
    'emergencyContact.phone',
    'emergencyContact.relationship',
  ],
  other: [], // wildcard — allow anything for HR-initiated requests
};

// Flatten all allowed fields for validation
const ALL_ALLOWED_FIELDS = Object.values(ALLOWED_CHANGE_FIELDS).flat();

/**
 * Check if a user has HR-level access
 */
function isHROrAdmin(role) {
  const normalised = role?.toLowerCase();
  return ['hr', 'admin', 'superadmin'].includes(normalised);
}

/**
 * Get the nested value from an object using a dot-notation path.
 * e.g. get({ bankDetails: { accountNumber: '123' } }, 'bankDetails.accountNumber') → '123'
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((curr, key) => curr?.[key], obj);
}

/**
 * Set nested value using dot-notation path
 */
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((curr, key) => curr[key] = curr[key] || {}, obj);
  target[lastKey] = value;
  return obj;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CREATE CHANGE REQUEST (Employee submits a request - can include multiple fields)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Employee submits a change request for sensitive profile fields
 *          Supports both single field (legacy) and multiple fields in one request
 * @route   POST /api/change-requests
 * @access  Private (All authenticated users)
 */
export const createChangeRequest = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  const { requestType, fields, reason, fieldChanged, fieldLabel, oldValue, newValue } = req.body;

  // Support both new (fields array) and legacy (single field) formats
  let requestFields = fields;

  // Legacy format: single field
  if (!requestFields?.length && fieldChanged) {
    requestFields = [{
      field: fieldChanged,
      label: fieldLabel || fieldChanged,
      oldValue: oldValue ?? null,
      newValue,
    }];
  }

  // Validate fields array
  if (!requestFields || !Array.isArray(requestFields) || requestFields.length === 0) {
    throw buildValidationError('fields', 'At least one field must be provided');
  }

  // Validate each field
  for (const fieldData of requestFields) {
    if (!fieldData.field) {
      throw buildValidationError('fields.field', 'Each field must have a "field" property');
    }
    if (fieldData.newValue === undefined || fieldData.newValue === null) {
      throw buildValidationError('fields.newValue', `New value is required for field: ${fieldData.field}`);
    }

    // Validate complex object fields
    if (fieldData.field === 'bankDetails' && typeof fieldData.newValue === 'object') {
      if (!fieldData.newValue.bankName || !fieldData.newValue.accountNumber ||
          !fieldData.newValue.ifscCode || !fieldData.newValue.branch) {
        throw buildValidationError('fields.newValue', 'Bank details must include: bankName, accountNumber, ifscCode, and branch');
      }
      // Validate bank name length
      if (fieldData.newValue.bankName.trim().length < 3) {
        throw buildValidationError('fields.newValue.bankName', 'Bank name must be at least 3 characters');
      }
      // Validate account number format (8-18 digits only)
      const cleanAccountNumber = fieldData.newValue.accountNumber.replace(/[\s-]/g, '');
      if (!/^\d{8,18}$/.test(cleanAccountNumber)) {
        throw buildValidationError('fields.newValue.accountNumber', 'Account number must be 8-18 digits');
      }
      // Validate IFSC code format (4 letters + 0 + 6 alphanumeric)
      const ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscPattern.test(fieldData.newValue.ifscCode.toUpperCase())) {
        throw buildValidationError('fields.newValue.ifscCode', 'Invalid IFSC format (e.g., SBIN0001234). Must be 11 characters: 4 letters + 0 + 6 alphanumeric');
      }
      // Validate branch length
      if (fieldData.newValue.branch.trim().length < 2) {
        throw buildValidationError('fields.newValue.branch', 'Branch name must be at least 2 characters');
      }
    }
    if (fieldData.field === 'address' && typeof fieldData.newValue === 'object') {
      if (!fieldData.newValue.city || !fieldData.newValue.state ||
          !fieldData.newValue.country || !fieldData.newValue.postalCode) {
        throw buildValidationError('fields.newValue', 'Address must include: city, state, country, and postalCode');
      }
    }
    if (fieldData.field === 'emergencyContact' && typeof fieldData.newValue === 'object') {
      if (!fieldData.newValue.name || !fieldData.newValue.phone || !fieldData.newValue.relationship) {
        throw buildValidationError('fields.newValue', 'Emergency contact must include: name, phone, and relationship');
      }
    }

    // Validate that the field is in the allowed list (unless requestType is 'other')
    const actualRequestType = requestType || (requestFields.length > 1 ? 'multiple' : 'other');
    if (actualRequestType !== 'other' && !ALL_ALLOWED_FIELDS.includes(fieldData.field)) {
      throw buildValidationError('fields.field', `Field '${fieldData.field}' is not allowed for change requests`);
    }
  }

  if (!reason || reason.trim().length < 5) {
    throw buildValidationError('reason', 'Reason is required (minimum 5 characters)');
  }

  const collections = getTenantCollections(user.companyId);

  // Find the employee record to get current values + ObjectId
  const employee = await collections.employees.findOne(
    { clerkUserId: user.userId, isDeleted: { $ne: true } },
    {
      projection: {
        _id: 1,
        employeeId: 1,
        firstName: 1,
        lastName: 1,
        bankDetails: 1,
        phone: 1,
        address: 1,
        emergencyContact: 1,
      }
    }
  );

  if (!employee) {
    throw buildNotFoundError('Employee', user.userId);
  }

  // Check for duplicate pending requests for the same fields
  const fieldPaths = requestFields.map(f => f.field);
  const existingPending = await collections.changeRequests.findOne({
    employeeObjectId: employee._id,
    'fields.field': { $in: fieldPaths },
    'fields.status': 'pending',
    isDeleted: { $ne: true },
  });

  if (existingPending) {
    const duplicateFields = existingPending.fields
      .filter(f => f.status === 'pending' && fieldPaths.includes(f.field))
      .map(f => f.label || f.field);
    throw buildValidationError(
      'fields',
      `Pending change requests already exist for: ${duplicateFields.join(', ')}. Please wait for HR to review them.`
    );
  }

  // Capture the current (old) values from the employee document for each field
  const fieldsWithOldValues = requestFields.map(fieldData => ({
    ...fieldData,
    oldValue: getNestedValue(employee, fieldData.field),
  }));

  const employeeName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
  const actualRequestType = requestType || (fieldsWithOldValues.length > 1 ? 'multiple' : 'other');

  const doc = buildChangeRequestDocument({
    companyId: user.companyId,
    employeeId: employee.employeeId || user.employeeId,
    employeeObjectId: employee._id,
    employeeName,
    requestType: actualRequestType,
    fields: fieldsWithOldValues,
    reason: reason.trim(),
  });

  const result = await collections.changeRequests.insertOne(doc);

  logger.info('[ChangeRequest] Created change request', {
    id: result.insertedId,
    employeeId: doc.employeeId,
    fieldCount: doc.fields.length,
    status: 'pending',
  });

  return sendCreated(res, { ...doc, _id: result.insertedId }, `Change request submitted successfully with ${doc.fields.length} field(s). HR will review it shortly.`);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET MY CHANGE REQUESTS (Employee sees their own)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Get current employee's own change requests
 * @route   GET /api/change-requests/my
 * @access  Private (All authenticated users)
 */
export const getMyChangeRequests = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  const { status, page = 1, limit = 20 } = req.query;

  const collections = getTenantCollections(user.companyId);

  // Find employee by clerkUserId
  const employee = await collections.employees.findOne(
    { clerkUserId: user.userId, isDeleted: { $ne: true } },
    { projection: { _id: 1, employeeId: 1 } }
  );

  if (!employee) {
    throw buildNotFoundError('Employee', user.userId);
  }

  const filter = {
    employeeObjectId: employee._id,
    isDeleted: { $ne: true },
  };

  if (status) {
    filter.status = status;
  }

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [requests, total] = await Promise.all([
    collections.changeRequests
      .find(filter)
      .sort({ requestedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .toArray(),
    collections.changeRequests.countDocuments(filter),
  ]);

  const pagination = buildPagination(pageNum, limitNum, total);

  return sendSuccess(res, requests, 'Change requests retrieved successfully', 200, pagination);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. GET ALL CHANGE REQUESTS (HR sees all)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Get all change requests in the company (HR/Admin only)
 * @route   GET /api/change-requests
 * @access  Private (HR, Admin, Superadmin)
 */
export const getAllChangeRequests = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  if (!isHROrAdmin(user.role)) {
    throw buildForbiddenError('Only HR or Admin can view all change requests');
  }

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  const { status, requestType, employeeId, page = 1, limit = 20 } = req.query;

  const collections = getTenantCollections(user.companyId);

  const filter = { isDeleted: { $ne: true } };

  if (status) filter.status = status;
  if (requestType) filter.requestType = requestType;
  if (employeeId) filter.employeeId = employeeId;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [requests, total] = await Promise.all([
    collections.changeRequests
      .find(filter)
      .sort({ requestedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .toArray(),
    collections.changeRequests.countDocuments(filter),
  ]);

  const pagination = buildPagination(pageNum, limitNum, total);

  return sendSuccess(res, requests, 'Change requests retrieved successfully', 200, pagination);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. FIELD-LEVEL APPROVE/REJECT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Approve a specific field within a change request
 */
async function approveFieldInRequest(collections, requestId, fieldIndex, reviewer, reviewNote) {
  const changeRequest = await collections.changeRequests.findOne({
    _id: new ObjectId(requestId),
    isDeleted: { $ne: true },
  });

  if (!changeRequest) {
    throw buildNotFoundError('Change Request', requestId);
  }

  if (changeRequest.status === 'cancelled') {
    throw buildValidationError('status', 'This request has been cancelled');
  }

  if (!changeRequest.fields[fieldIndex]) {
    throw buildValidationError('fieldIndex', `Field at index ${fieldIndex} not found`);
  }

  if (changeRequest.fields[fieldIndex].status !== 'pending') {
    throw buildValidationError('status', `Field is already ${changeRequest.fields[fieldIndex].status}`);
  }

  const field = changeRequest.fields[fieldIndex];

  // Apply the newValue to the employee document
  let valueToApply = field.newValue;
  if (typeof valueToApply === 'string' && ['bankDetails', 'address', 'emergencyContact'].includes(field.field)) {
    try {
      valueToApply = JSON.parse(valueToApply);
    } catch (e) {
      // If parsing fails, use the original value
    }
  }

  // Convert IFSC code to uppercase before saving
  if (field.field === 'bankDetails.ifscCode' && typeof valueToApply === 'string') {
    valueToApply = valueToApply.toUpperCase();
  }

  await collections.employees.updateOne(
    { _id: changeRequest.employeeObjectId, isDeleted: { $ne: true } },
    { $set: { [field.field]: valueToApply, updatedAt: new Date() } }
  );

  // Update field status
  const fieldUpdatePath = `fields.${fieldIndex}.status`;
  const fieldReviewNotePath = `fields.${fieldIndex}.reviewNote`;
  const fieldReviewedAtPath = `fields.${fieldIndex}.reviewedAt`;

  const now = new Date();
  await collections.changeRequests.updateOne(
    { _id: new ObjectId(requestId) },
    {
      $set: {
        [fieldUpdatePath]: 'approved',
        [fieldReviewNotePath]: reviewNote?.trim() || null,
        [fieldReviewedAtPath]: now,
        reviewedBy: reviewer._id,
        reviewerName: reviewer.name,
        reviewedAt: now,
        updatedAt: now,
      },
    }
  );

  // Fetch updated request to compute new status
  const updatedRequest = await collections.changeRequests.findOne({
    _id: new ObjectId(requestId),
  });

  const updatedWithStatus = updateRequestStatus(updatedRequest);

  // Update overall status if needed
  if (updatedWithStatus.status !== updatedRequest.status) {
    await collections.changeRequests.updateOne(
      { _id: new ObjectId(requestId) },
      { $set: { status: updatedWithStatus.status, updatedAt: now } }
    );
  }

  logger.info('[ChangeRequest] Approved field in change request', {
    id: requestId,
    fieldIndex,
    field: field.field,
    employeeId: changeRequest.employeeId,
  });

  return { ...updatedRequest, _id: updatedRequest._id };
}

/**
 * Reject a specific field within a change request
 */
async function rejectFieldInRequest(collections, requestId, fieldIndex, reviewer, reviewNote) {
  const changeRequest = await collections.changeRequests.findOne({
    _id: new ObjectId(requestId),
    isDeleted: { $ne: true },
  });

  if (!changeRequest) {
    throw buildNotFoundError('Change Request', requestId);
  }

  if (changeRequest.status === 'cancelled') {
    throw buildValidationError('status', 'This request has been cancelled');
  }

  if (!changeRequest.fields[fieldIndex]) {
    throw buildValidationError('fieldIndex', `Field at index ${fieldIndex} not found`);
  }

  if (changeRequest.fields[fieldIndex].status !== 'pending') {
    throw buildValidationError('status', `Field is already ${changeRequest.fields[fieldIndex].status}`);
  }

  if (!reviewNote || reviewNote.trim().length < 5) {
    throw buildValidationError('reviewNote', 'Rejection reason is required (minimum 5 characters)');
  }

  const field = changeRequest.fields[fieldIndex];

  // Update field status to rejected (don't apply to employee)
  const fieldUpdatePath = `fields.${fieldIndex}.status`;
  const fieldReviewNotePath = `fields.${fieldIndex}.reviewNote`;
  const fieldReviewedAtPath = `fields.${fieldIndex}.reviewedAt`;

  const now = new Date();
  await collections.changeRequests.updateOne(
    { _id: new ObjectId(requestId) },
    {
      $set: {
        [fieldUpdatePath]: 'rejected',
        [fieldReviewNotePath]: reviewNote.trim(),
        [fieldReviewedAtPath]: now,
        reviewedBy: reviewer._id,
        reviewerName: reviewer.name,
        reviewedAt: now,
        updatedAt: now,
      },
    }
  );

  // Fetch updated request to compute new status
  const updatedRequest = await collections.changeRequests.findOne({
    _id: new ObjectId(requestId),
  });

  const updatedWithStatus = updateRequestStatus(updatedRequest);

  // Update overall status if needed
  if (updatedWithStatus.status !== updatedRequest.status) {
    await collections.changeRequests.updateOne(
      { _id: new ObjectId(requestId) },
      { $set: { status: updatedWithStatus.status, updatedAt: now } }
    );
  }

  logger.info('[ChangeRequest] Rejected field in change request', {
    id: requestId,
    fieldIndex,
    field: field.field,
    employeeId: changeRequest.employeeId,
  });

  return { ...updatedRequest, _id: updatedRequest._id };
}

/**
 * @desc    Approve a specific field within a change request
 * @route   PATCH /api/change-requests/:id/field/:fieldIdx/approve
 * @access  Private (HR, Admin, Superadmin)
 */
export const approveField = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  if (!isHROrAdmin(user.role)) {
    throw buildForbiddenError('Only HR or Admin can approve change requests');
  }

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  const { id, fieldIdx } = req.params;
  const { reviewNote } = req.body;

  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid change request ID');
  }

  const fieldIndex = parseInt(fieldIdx);
  if (isNaN(fieldIndex) || fieldIndex < 0) {
    throw buildValidationError('fieldIdx', 'Invalid field index');
  }

  const collections = getTenantCollections(user.companyId);

  // Get the reviewer's employee record
  const reviewerDoc = await collections.employees.findOne(
    { clerkUserId: user.userId, isDeleted: { $ne: true } },
    { projection: { _id: 1, firstName: 1, lastName: 1 } }
  );
  const reviewer = {
    _id: reviewerDoc?._id || null,
    name: reviewerDoc ? `${reviewerDoc.firstName || ''} ${reviewerDoc.lastName || ''}`.trim() : user.email || 'HR',
  };

  const updatedRequest = await approveFieldInRequest(collections, id, fieldIndex, reviewer, reviewNote);

  const field = updatedRequest.fields[fieldIndex];
  return sendSuccess(res, updatedRequest, `Field "${field.label}" approved successfully.`);
});

/**
 * @desc    Reject a specific field within a change request
 * @route   PATCH /api/change-requests/:id/field/:fieldIdx/reject
 * @access  Private (HR, Admin, Superadmin)
 */
export const rejectField = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  if (!isHROrAdmin(user.role)) {
    throw buildForbiddenError('Only HR or Admin can reject change requests');
  }

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  const { id, fieldIdx } = req.params;
  const { reviewNote } = req.body;

  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid change request ID');
  }

  const fieldIndex = parseInt(fieldIdx);
  if (isNaN(fieldIndex) || fieldIndex < 0) {
    throw buildValidationError('fieldIdx', 'Invalid field index');
  }

  if (!reviewNote || reviewNote.trim().length < 5) {
    throw buildValidationError('reviewNote', 'Rejection reason is required (minimum 5 characters)');
  }

  const collections = getTenantCollections(user.companyId);

  // Get the reviewer's employee record
  const reviewerDoc = await collections.employees.findOne(
    { clerkUserId: user.userId, isDeleted: { $ne: true } },
    { projection: { _id: 1, firstName: 1, lastName: 1 } }
  );
  const reviewer = {
    _id: reviewerDoc?._id || null,
    name: reviewerDoc ? `${reviewerDoc.firstName || ''} ${reviewerDoc.lastName || ''}`.trim() : user.email || 'HR',
  };

  const updatedRequest = await rejectFieldInRequest(collections, id, fieldIndex, reviewer, reviewNote);

  const field = updatedRequest.fields[fieldIndex];
  return sendSuccess(res, updatedRequest, `Field "${field.label}" rejected.`);
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. BULK APPROVE/REJECT ALL PENDING FIELDS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Approve all pending fields in a change request
 * @route   PATCH /api/change-requests/:id/bulk-approve
 * @access  Private (HR, Admin, Superadmin)
 */
export const bulkApproveFields = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  if (!isHROrAdmin(user.role)) {
    throw buildForbiddenError('Only HR or Admin can approve change requests');
  }

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  const { id } = req.params;
  const { reviewNote } = req.body;

  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid change request ID');
  }

  const collections = getTenantCollections(user.companyId);

  const changeRequest = await collections.changeRequests.findOne({
    _id: new ObjectId(id),
    isDeleted: { $ne: true },
  });

  if (!changeRequest) {
    throw buildNotFoundError('Change Request', id);
  }

  if (changeRequest.status === 'cancelled') {
    throw buildValidationError('status', 'This request has been cancelled');
  }

  // Get the reviewer's employee record
  const reviewerDoc = await collections.employees.findOne(
    { clerkUserId: user.userId, isDeleted: { $ne: true } },
    { projection: { _id: 1, firstName: 1, lastName: 1 } }
  );
  const reviewer = {
    _id: reviewerDoc?._id || null,
    name: reviewerDoc ? `${reviewerDoc.firstName || ''} ${reviewerDoc.lastName || ''}`.trim() : user.email || 'HR',
  };

  const pendingFields = changeRequest.fields
    .map((f, idx) => ({ ...f, index: idx }))
    .filter(f => f.status === 'pending');

  if (pendingFields.length === 0) {
    throw buildValidationError('status', 'No pending fields to approve');
  }

  // Approve each pending field
  for (const field of pendingFields) {
    await approveFieldInRequest(collections, id, field.index, reviewer, reviewNote);
  }

  logger.info('[ChangeRequest] Bulk approved fields', {
    id,
    count: pendingFields.length,
    employeeId: changeRequest.employeeId,
  });

  return sendSuccess(res, { id, approvedCount: pendingFields.length }, `Approved ${pendingFields.length} field(s) successfully.`);
});

/**
 * @desc    Reject all pending fields in a change request
 * @route   PATCH /api/change-requests/:id/bulk-reject
 * @access  Private (HR, Admin, Superadmin)
 */
export const bulkRejectFields = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  if (!isHROrAdmin(user.role)) {
    throw buildForbiddenError('Only HR or Admin can reject change requests');
  }

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  const { id } = req.params;
  const { reviewNote } = req.body;

  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid change request ID');
  }

  if (!reviewNote || reviewNote.trim().length < 5) {
    throw buildValidationError('reviewNote', 'Rejection reason is required (minimum 5 characters)');
  }

  const collections = getTenantCollections(user.companyId);

  const changeRequest = await collections.changeRequests.findOne({
    _id: new ObjectId(id),
    isDeleted: { $ne: true },
  });

  if (!changeRequest) {
    throw buildNotFoundError('Change Request', id);
  }

  if (changeRequest.status === 'cancelled') {
    throw buildValidationError('status', 'This request has been cancelled');
  }

  // Get the reviewer's employee record
  const reviewerDoc = await collections.employees.findOne(
    { clerkUserId: user.userId, isDeleted: { $ne: true } },
    { projection: { _id: 1, firstName: 1, lastName: 1 } }
  );
  const reviewer = {
    _id: reviewerDoc?._id || null,
    name: reviewerDoc ? `${reviewerDoc.firstName || ''} ${reviewerDoc.lastName || ''}`.trim() : user.email || 'HR',
  };

  const pendingFields = changeRequest.fields
    .map((f, idx) => ({ ...f, index: idx }))
    .filter(f => f.status === 'pending');

  if (pendingFields.length === 0) {
    throw buildValidationError('status', 'No pending fields to reject');
  }

  // Reject each pending field
  for (const field of pendingFields) {
    await rejectFieldInRequest(collections, id, field.index, reviewer, reviewNote);
  }

  logger.info('[ChangeRequest] Bulk rejected fields', {
    id,
    count: pendingFields.length,
    employeeId: changeRequest.employeeId,
  });

  return sendSuccess(res, { id, rejectedCount: pendingFields.length }, `Rejected ${pendingFields.length} field(s).`);
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. CANCEL REQUEST (Employee or HR can cancel pending request)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Cancel a pending change request
 * @route   PATCH /api/change-requests/:id/cancel
 * @access  Private (Employee can cancel own, HR can cancel any)
 */
export const cancelChangeRequest = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  const { id } = req.params;
  const { reason } = req.body;

  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid change request ID');
  }

  if (!reason || reason.trim().length < 5) {
    throw buildValidationError('reason', 'Cancellation reason is required (minimum 5 characters)');
  }

  const collections = getTenantCollections(user.companyId);

  const changeRequest = await collections.changeRequests.findOne({
    _id: new ObjectId(id),
    isDeleted: { $ne: true },
  });

  if (!changeRequest) {
    throw buildNotFoundError('Change Request', id);
  }

  // Check if user owns this request or is HR
  const employee = await collections.employees.findOne(
    { clerkUserId: user.userId, isDeleted: { $ne: true } },
    { projection: { _id: 1 } }
  );

  const isOwner = employee && employee._id.equals(changeRequest.employeeObjectId);
  const isHR = isHROrAdmin(user.role);

  if (!isOwner && !isHR) {
    throw buildForbiddenError('You can only cancel your own change requests');
  }

  if (changeRequest.status === 'cancelled') {
    throw buildValidationError('status', 'This request is already cancelled');
  }

  // Check if any fields are already approved (cannot cancel if any field is approved)
  const hasApprovedFields = changeRequest.fields.some(f => f.status === 'approved');
  if (hasApprovedFields) {
    throw buildValidationError('status', 'Cannot cancel request: some fields have already been approved');
  }

  // Get the canceller's info
  const cancellerDoc = await collections.employees.findOne(
    { clerkUserId: user.userId, isDeleted: { $ne: true } },
    { projection: { _id: 1, firstName: 1, lastName: 1 } }
  );
  const cancellerName = cancellerDoc
    ? `${cancellerDoc.firstName || ''} ${cancellerDoc.lastName || ''}`.trim()
    : user.email || 'User';

  const now = new Date();
  await collections.changeRequests.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status: 'cancelled',
        cancelledBy: cancellerDoc?._id || null,
        cancelledByName: cancellerName,
        cancelledAt: now,
        cancellationReason: reason.trim(),
        updatedAt: now,
      },
    }
  );

  logger.info('[ChangeRequest] Cancelled change request', {
    id,
    employeeId: changeRequest.employeeId,
    cancelledBy: user.userId,
  });

  return sendSuccess(res, { id, status: 'cancelled' }, 'Change request cancelled successfully.');
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. LEGACY APPROVE/REJECT ENDPOINTS (for backward compatibility - approve all fields)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Approve a change request — approves all pending fields and applies to employee
 * @route   PATCH /api/change-requests/:id/approve
 * @access  Private (HR, Admin, Superadmin)
 */
export const approveChangeRequest = asyncHandler(async (req, res) => {
  // Redirect to bulk approve
  return bulkApproveFields(req, res);
});

/**
 * @desc    Reject a change request — rejects all pending fields
 * @route   PATCH /api/change-requests/:id/reject
 * @access  Private (HR, Admin, Superadmin)
 */
export const rejectChangeRequest = asyncHandler(async (req, res) => {
  // Redirect to bulk reject
  return bulkRejectFields(req, res);
});
