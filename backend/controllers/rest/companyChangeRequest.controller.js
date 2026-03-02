/**
 * Company Change Request REST Controller
 * Handles Admin -> Superadmin change requests for sensitive company profile fields.
 * Critical fields (billing, legal, classification) go through superadmin approval before being applied.
 *
 * Supports multiple fields per request with individual field-level approval.
 *
 * Routes:
 *   POST   /api/company-change-requests                          -> submitChangeRequest   (admin)
 *   GET    /api/company-change-requests/my                       -> getMyRequests         (admin)
 *   GET    /api/company-change-requests                          -> getAllRequests         (superadmin)
 *   GET    /api/company-change-requests/stats                    -> getRequestStats       (superadmin)
 *   PATCH  /api/company-change-requests/:id/field/:fieldIdx/approve -> approveField       (superadmin)
 *   PATCH  /api/company-change-requests/:id/field/:fieldIdx/reject  -> rejectField        (superadmin)
 *   PATCH  /api/company-change-requests/:id/bulk-approve         -> bulkApprove           (superadmin)
 *   PATCH  /api/company-change-requests/:id/bulk-reject          -> bulkReject            (superadmin)
 *   PATCH  /api/company-change-requests/:id/cancel               -> cancelRequest         (admin)
 */

import { ObjectId } from 'mongodb';
import { client } from '../../config/db.js';
import { getsuperadminCollections } from '../../config/db.js';
import {
  asyncHandler,
  buildForbiddenError,
  buildNotFoundError,
  buildValidationError,
} from '../../middleware/errorHandler.js';
import {
  ALLOWED_COMPANY_CHANGE_FIELDS,
  buildCompanyChangeRequestDocument,
  computeRequestStatus,
  updateRequestStatus,
} from '../../models/superadmin/companyChangeRequest.schema.js';
import {
  extractUser,
  sendCreated,
  sendSuccess,
} from '../../utils/apiResponse.js';
import { devLog, devError } from '../../utils/logger.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the companyChangeRequests collection from the superadmin database.
 */
function getChangeRequestsCollection() {
  const db = client.db('AmasQIS');
  return db.collection('companyChangeRequests');
}

/**
 * Check if a user has admin-level access (can submit company change requests).
 */
function isAdmin(role) {
  const normalised = role?.toLowerCase();
  return ['admin', 'superadmin'].includes(normalised);
}

/**
 * Check if a user has superadmin-level access (can review company change requests).
 */
function isSuperadmin(role) {
  return role?.toLowerCase() === 'superadmin';
}

/**
 * Get the nested value from an object using a dot-notation path.
 * e.g. get({ billingAddress: { street: '123 Main' } }, 'billingAddress.street') -> '123 Main'
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((curr, key) => curr?.[key], obj);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. SUBMIT CHANGE REQUEST (Admin submits a request)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Admin submits a change request for sensitive company fields
 * @route   POST /api/company-change-requests
 * @access  Private (Admin)
 */
export const submitChangeRequest = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  if (!isAdmin(user.role)) {
    throw buildForbiddenError('Only Admin users can submit company change requests');
  }

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  const { requestType, fields, reason } = req.body;

  // Validate fields array
  if (!fields || !Array.isArray(fields) || fields.length === 0) {
    throw buildValidationError('fields', 'At least one field must be provided');
  }

  // Validate each field against ALLOWED_COMPANY_CHANGE_FIELDS
  for (const fieldData of fields) {
    if (!fieldData.field) {
      throw buildValidationError('fields.field', 'Each field must have a "field" property');
    }
    if (fieldData.newValue === undefined || fieldData.newValue === null) {
      throw buildValidationError('fields.newValue', `New value is required for field: ${fieldData.field}`);
    }

    if (!ALLOWED_COMPANY_CHANGE_FIELDS.has(fieldData.field)) {
      throw buildValidationError(
        'fields.field',
        `Field '${fieldData.field}' is not allowed for company change requests`
      );
    }
  }

  if (!reason || reason.trim().length < 5) {
    throw buildValidationError('reason', 'Reason is required (minimum 5 characters)');
  }

  const { companiesCollection } = getsuperadminCollections();
  const changeRequestsCollection = getChangeRequestsCollection();

  // Find the company document to capture current (old) values
  let companyObjectId;
  try {
    companyObjectId = new ObjectId(user.companyId);
  } catch {
    throw buildValidationError('companyId', 'Invalid company ID format');
  }

  const company = await companiesCollection.findOne({
    _id: companyObjectId,
    isDeleted: { $ne: true },
  });

  if (!company) {
    throw buildNotFoundError('Company', user.companyId);
  }

  // Check for existing pending requests for the same field+company
  const fieldPaths = fields.map(f => f.field);
  const existingPending = await changeRequestsCollection.findOne({
    companyId: companyObjectId,
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
      `Pending change requests already exist for: ${duplicateFields.join(', ')}. Please wait for superadmin to review them.`
    );
  }

  // Capture old values from the company document for each field
  const fieldsWithOldValues = fields.map(fieldData => ({
    ...fieldData,
    label: fieldData.label || ALLOWED_COMPANY_CHANGE_FIELDS.get(fieldData.field) || fieldData.field,
    oldValue: getNestedValue(company, fieldData.field),
  }));

  const doc = buildCompanyChangeRequestDocument({
    companyId: companyObjectId,
    companyName: company.companyName || company.name || '',
    requestedBy: user.userId,
    requestedByName: user.email || '',
    requestType: requestType || (fieldsWithOldValues.length > 1 ? 'multiple' : 'billing'),
    fields: fieldsWithOldValues,
    reason: reason.trim(),
  });

  const result = await changeRequestsCollection.insertOne(doc);

  devLog('[CompanyChangeRequest] Created company change request', {
    id: result.insertedId,
    companyId: user.companyId,
    fieldCount: doc.fields.length,
    status: 'pending',
  });

  return sendCreated(
    res,
    { ...doc, _id: result.insertedId },
    `Company change request submitted successfully with ${doc.fields.length} field(s). Superadmin will review it shortly.`
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET MY REQUESTS (Admin views own company's requests)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Get change requests for the admin's company
 * @route   GET /api/company-change-requests/my
 * @access  Private (Admin)
 */
export const getMyRequests = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  const { status } = req.query;

  const changeRequestsCollection = getChangeRequestsCollection();

  let companyObjectId;
  try {
    companyObjectId = new ObjectId(user.companyId);
  } catch {
    throw buildValidationError('companyId', 'Invalid company ID format');
  }

  const filter = {
    companyId: companyObjectId,
    isDeleted: { $ne: true },
  };

  if (status) {
    filter.status = status;
  }

  const requests = await changeRequestsCollection
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();

  return sendSuccess(res, requests, 'Company change requests retrieved successfully');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. GET ALL REQUESTS (Superadmin views all requests)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Get all company change requests (Superadmin only)
 * @route   GET /api/company-change-requests
 * @access  Private (Superadmin)
 */
export const getAllRequests = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  if (!isSuperadmin(user.role)) {
    throw buildForbiddenError('Only Superadmin can view all company change requests');
  }

  const { status, companyId, requestType } = req.query;

  const changeRequestsCollection = getChangeRequestsCollection();

  const filter = { isDeleted: { $ne: true } };

  if (status) filter.status = status;
  if (requestType) filter.requestType = requestType;
  if (companyId) {
    try {
      filter.companyId = new ObjectId(companyId);
    } catch {
      throw buildValidationError('companyId', 'Invalid company ID format');
    }
  }

  const requests = await changeRequestsCollection
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();

  return sendSuccess(res, requests, 'All company change requests retrieved successfully');
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. GET REQUEST STATS (Superadmin gets counts)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Get company change request statistics
 * @route   GET /api/company-change-requests/stats
 * @access  Private (Superadmin)
 */
export const getRequestStats = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  if (!isSuperadmin(user.role)) {
    throw buildForbiddenError('Only Superadmin can view company change request stats');
  }

  const changeRequestsCollection = getChangeRequestsCollection();

  const baseFilter = { isDeleted: { $ne: true } };

  const [pending, completed, cancelled] = await Promise.all([
    changeRequestsCollection.countDocuments({ ...baseFilter, status: 'pending' }),
    changeRequestsCollection.countDocuments({ ...baseFilter, status: 'completed' }),
    changeRequestsCollection.countDocuments({ ...baseFilter, status: 'cancelled' }),
  ]);

  return sendSuccess(res, { pending, completed, cancelled }, 'Company change request stats retrieved successfully');
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. FIELD-LEVEL APPROVE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Internal helper: approve a specific field within a company change request.
 */
async function approveFieldInRequest(changeRequestsCollection, companiesCollection, requestId, fieldIndex, reviewer, reviewNote) {
  const changeRequest = await changeRequestsCollection.findOne({
    _id: new ObjectId(requestId),
    isDeleted: { $ne: true },
  });

  if (!changeRequest) {
    throw buildNotFoundError('Company Change Request', requestId);
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

  // Apply the newValue to the company document
  await companiesCollection.updateOne(
    { _id: changeRequest.companyId, isDeleted: { $ne: true } },
    { $set: { [field.field]: field.newValue, updatedAt: new Date() } }
  );

  // Update field status
  const now = new Date();
  await changeRequestsCollection.updateOne(
    { _id: new ObjectId(requestId) },
    {
      $set: {
        [`fields.${fieldIndex}.status`]: 'approved',
        [`fields.${fieldIndex}.reviewNote`]: reviewNote?.trim() || null,
        [`fields.${fieldIndex}.reviewedAt`]: now,
        reviewedBy: reviewer.userId,
        reviewerName: reviewer.name,
        reviewedAt: now,
        updatedAt: now,
      },
    }
  );

  // Fetch updated request to recompute overall status
  const updatedRequest = await changeRequestsCollection.findOne({
    _id: new ObjectId(requestId),
  });

  const updatedWithStatus = updateRequestStatus(updatedRequest);

  // Update overall status if needed
  if (updatedWithStatus.status !== updatedRequest.status) {
    await changeRequestsCollection.updateOne(
      { _id: new ObjectId(requestId) },
      { $set: { status: updatedWithStatus.status, updatedAt: now } }
    );
  }

  devLog('[CompanyChangeRequest] Approved field in company change request', {
    id: requestId,
    fieldIndex,
    field: field.field,
    companyId: changeRequest.companyId,
  });

  return { ...updatedRequest, status: updatedWithStatus.status };
}

/**
 * Internal helper: reject a specific field within a company change request.
 */
async function rejectFieldInRequest(changeRequestsCollection, requestId, fieldIndex, reviewer, reviewNote) {
  const changeRequest = await changeRequestsCollection.findOne({
    _id: new ObjectId(requestId),
    isDeleted: { $ne: true },
  });

  if (!changeRequest) {
    throw buildNotFoundError('Company Change Request', requestId);
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

  // Update field status to rejected (don't apply to company)
  const now = new Date();
  await changeRequestsCollection.updateOne(
    { _id: new ObjectId(requestId) },
    {
      $set: {
        [`fields.${fieldIndex}.status`]: 'rejected',
        [`fields.${fieldIndex}.reviewNote`]: reviewNote.trim(),
        [`fields.${fieldIndex}.reviewedAt`]: now,
        reviewedBy: reviewer.userId,
        reviewerName: reviewer.name,
        reviewedAt: now,
        updatedAt: now,
      },
    }
  );

  // Fetch updated request to recompute overall status
  const updatedRequest = await changeRequestsCollection.findOne({
    _id: new ObjectId(requestId),
  });

  const updatedWithStatus = updateRequestStatus(updatedRequest);

  // Update overall status if needed
  if (updatedWithStatus.status !== updatedRequest.status) {
    await changeRequestsCollection.updateOne(
      { _id: new ObjectId(requestId) },
      { $set: { status: updatedWithStatus.status, updatedAt: now } }
    );
  }

  devLog('[CompanyChangeRequest] Rejected field in company change request', {
    id: requestId,
    fieldIndex,
    field: field.field,
    companyId: changeRequest.companyId,
  });

  return { ...updatedRequest, status: updatedWithStatus.status };
}

/**
 * @desc    Approve a specific field within a company change request
 * @route   PATCH /api/company-change-requests/:id/field/:fieldIdx/approve
 * @access  Private (Superadmin)
 */
export const approveField = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  if (!isSuperadmin(user.role)) {
    throw buildForbiddenError('Only Superadmin can approve company change requests');
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

  const { companiesCollection } = getsuperadminCollections();
  const changeRequestsCollection = getChangeRequestsCollection();

  const reviewer = {
    userId: user.userId,
    name: user.email || 'Superadmin',
  };

  const updatedRequest = await approveFieldInRequest(
    changeRequestsCollection, companiesCollection, id, fieldIndex, reviewer, reviewNote
  );

  const field = updatedRequest.fields[fieldIndex];
  return sendSuccess(res, updatedRequest, `Field "${field.label}" approved successfully.`);
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. FIELD-LEVEL REJECT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Reject a specific field within a company change request
 * @route   PATCH /api/company-change-requests/:id/field/:fieldIdx/reject
 * @access  Private (Superadmin)
 */
export const rejectField = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  if (!isSuperadmin(user.role)) {
    throw buildForbiddenError('Only Superadmin can reject company change requests');
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

  const changeRequestsCollection = getChangeRequestsCollection();

  const reviewer = {
    userId: user.userId,
    name: user.email || 'Superadmin',
  };

  const updatedRequest = await rejectFieldInRequest(
    changeRequestsCollection, id, fieldIndex, reviewer, reviewNote
  );

  const field = updatedRequest.fields[fieldIndex];
  return sendSuccess(res, updatedRequest, `Field "${field.label}" rejected.`);
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. BULK APPROVE (Approve all pending fields)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Approve all pending fields in a company change request
 * @route   PATCH /api/company-change-requests/:id/bulk-approve
 * @access  Private (Superadmin)
 */
export const bulkApprove = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  if (!isSuperadmin(user.role)) {
    throw buildForbiddenError('Only Superadmin can approve company change requests');
  }

  const { id } = req.params;
  const { reviewNote } = req.body;

  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid change request ID');
  }

  const { companiesCollection } = getsuperadminCollections();
  const changeRequestsCollection = getChangeRequestsCollection();

  const changeRequest = await changeRequestsCollection.findOne({
    _id: new ObjectId(id),
    isDeleted: { $ne: true },
  });

  if (!changeRequest) {
    throw buildNotFoundError('Company Change Request', id);
  }

  if (changeRequest.status === 'cancelled') {
    throw buildValidationError('status', 'This request has been cancelled');
  }

  const reviewer = {
    userId: user.userId,
    name: user.email || 'Superadmin',
  };

  const pendingFields = changeRequest.fields
    .map((f, idx) => ({ ...f, index: idx }))
    .filter(f => f.status === 'pending');

  if (pendingFields.length === 0) {
    throw buildValidationError('status', 'No pending fields to approve');
  }

  // Approve each pending field
  for (const field of pendingFields) {
    await approveFieldInRequest(
      changeRequestsCollection, companiesCollection, id, field.index, reviewer, reviewNote
    );
  }

  devLog('[CompanyChangeRequest] Bulk approved fields', {
    id,
    count: pendingFields.length,
    companyId: changeRequest.companyId,
  });

  return sendSuccess(
    res,
    { id, approvedCount: pendingFields.length },
    `Approved ${pendingFields.length} field(s) successfully.`
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. BULK REJECT (Reject all pending fields)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Reject all pending fields in a company change request
 * @route   PATCH /api/company-change-requests/:id/bulk-reject
 * @access  Private (Superadmin)
 */
export const bulkReject = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  if (!isSuperadmin(user.role)) {
    throw buildForbiddenError('Only Superadmin can reject company change requests');
  }

  const { id } = req.params;
  const { reviewNote } = req.body;

  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid change request ID');
  }

  if (!reviewNote || reviewNote.trim().length < 5) {
    throw buildValidationError('reviewNote', 'Rejection reason is required (minimum 5 characters)');
  }

  const changeRequestsCollection = getChangeRequestsCollection();

  const changeRequest = await changeRequestsCollection.findOne({
    _id: new ObjectId(id),
    isDeleted: { $ne: true },
  });

  if (!changeRequest) {
    throw buildNotFoundError('Company Change Request', id);
  }

  if (changeRequest.status === 'cancelled') {
    throw buildValidationError('status', 'This request has been cancelled');
  }

  const reviewer = {
    userId: user.userId,
    name: user.email || 'Superadmin',
  };

  const pendingFields = changeRequest.fields
    .map((f, idx) => ({ ...f, index: idx }))
    .filter(f => f.status === 'pending');

  if (pendingFields.length === 0) {
    throw buildValidationError('status', 'No pending fields to reject');
  }

  // Reject each pending field
  for (const field of pendingFields) {
    await rejectFieldInRequest(
      changeRequestsCollection, id, field.index, reviewer, reviewNote
    );
  }

  devLog('[CompanyChangeRequest] Bulk rejected fields', {
    id,
    count: pendingFields.length,
    companyId: changeRequest.companyId,
  });

  return sendSuccess(
    res,
    { id, rejectedCount: pendingFields.length },
    `Rejected ${pendingFields.length} field(s).`
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. CANCEL REQUEST (Admin cancels own pending request)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Cancel a pending company change request
 * @route   PATCH /api/company-change-requests/:id/cancel
 * @access  Private (Admin - own company's requests only)
 */
export const cancelRequest = asyncHandler(async (req, res) => {
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

  const changeRequestsCollection = getChangeRequestsCollection();

  const changeRequest = await changeRequestsCollection.findOne({
    _id: new ObjectId(id),
    isDeleted: { $ne: true },
  });

  if (!changeRequest) {
    throw buildNotFoundError('Company Change Request', id);
  }

  // Ensure the request belongs to the admin's company
  let companyObjectId;
  try {
    companyObjectId = new ObjectId(user.companyId);
  } catch {
    throw buildValidationError('companyId', 'Invalid company ID format');
  }

  if (!changeRequest.companyId.equals(companyObjectId)) {
    throw buildForbiddenError('You can only cancel change requests for your own company');
  }

  if (changeRequest.status !== 'pending') {
    throw buildValidationError('status', `Cannot cancel request with status '${changeRequest.status}'. Only pending requests can be cancelled.`);
  }

  const now = new Date();
  await changeRequestsCollection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status: 'cancelled',
        cancelledBy: user.userId,
        cancelledByName: user.email || 'Admin',
        cancelledAt: now,
        cancellationReason: reason.trim(),
        updatedAt: now,
      },
    }
  );

  devLog('[CompanyChangeRequest] Cancelled company change request', {
    id,
    companyId: user.companyId,
    cancelledBy: user.userId,
  });

  return sendSuccess(res, { id, status: 'cancelled' }, 'Company change request cancelled successfully.');
});

// ─────────────────────────────────────────────────────────────────────────────
// Default export
// ─────────────────────────────────────────────────────────────────────────────

export default {
  submitChangeRequest,
  getMyRequests,
  getAllRequests,
  getRequestStats,
  approveField,
  rejectField,
  bulkApprove,
  bulkReject,
  cancelRequest,
};
