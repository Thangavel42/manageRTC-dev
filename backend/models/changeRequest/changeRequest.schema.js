/**
 * Change Request Schema
 * Tracks employee-submitted requests to change sensitive profile fields.
 * Changes to critical fields (bank details, name) require HR approval before being applied.
 * This is NOT a Mongoose schema — it's a plain JS object used as documentation/validation reference
 * for the native MongoDB driver (following the multi-tenant db.js pattern in this project).
 *
 * Collection: 'changeRequests' (stored in each company's tenant database)
 *
 * REDESIGNED: Now supports multiple fields per request with individual field-level approval.
 */

/**
 * Change Request document structure:
 *
 * {
 *   _id: ObjectId (auto-generated),
 *   companyId: String (required) - tenant identifier,
 *   employeeId: String (required) - e.g. "EMP-1234",
 *   employeeObjectId: ObjectId (required) - _id of the employee document,
 *   employeeName: String - display name at time of request,
 *
 *   requestType: String (required) - one of:
 *     'bankDetails' | 'name' | 'phone' | 'address' | 'emergencyContact' | 'other' | 'multiple',
 *
 *   // NEW: Array of fields in this request (replaces single fieldChanged)
 *   fields: [
 *     {
 *       field: String (required) - dot-notation path, e.g. "bankDetails.accountNumber",
 *       label: String - human-readable label, e.g. "Account Number",
 *       oldValue: Mixed - snapshot of current value at time of request,
 *       newValue: Mixed (required) - the requested new value,
 *       status: String (default: 'pending') - 'pending' | 'approved' | 'rejected',
 *       reviewNote: String - HR review note for this specific field,
 *       reviewedAt: Date - when this field was reviewed
 *     }
 *   ],
 *
 *   // Legacy fields (kept for backward compatibility, populated from first field)
 *   fieldChanged: String - populated from fields[0].field,
 *   fieldLabel: String - populated from fields[0].label,
 *   oldValue: Mixed - populated from fields[0].oldValue,
 *   newValue: Mixed - populated from fields[0].newValue,
 *
 *   reason: String (required) - employee-provided reason for the change,
 *
 *   // Overall request status (computed from field statuses)
 *   status: String (default: 'pending') - one of: 'pending' | 'partially_approved' | 'completed' | 'cancelled',
 *   requestedAt: Date (default: now),
 *
 *   // Request-level review info
 *   reviewedBy: ObjectId - _id of HR/admin who last reviewed,
 *   reviewerName: String - display name of reviewer,
 *   reviewedAt: Date,
 *   reviewNote: String - overall review note,
 *
 *   // Cancellation
 *   cancelledBy: ObjectId - _id of user who cancelled (employee or HR),
 *   cancelledByName: String,
 *   cancelledAt: Date,
 *   cancellationReason: String,
 *
 *   isDeleted: Boolean (default: false),
 *   createdAt: Date,
 *   updatedAt: Date
 * }
 */

export const CHANGE_REQUEST_TYPES = [
  'bankDetails',
  'name',
  'phone',
  'address',
  'emergencyContact',
  'other',
  'multiple', // New type for requests with multiple fields
];

export const CHANGE_REQUEST_STATUSES = ['pending', 'partially_approved', 'completed', 'cancelled'];

export const FIELD_STATUSES = ['pending', 'approved', 'rejected'];

/**
 * Compute overall request status based on field statuses
 * - pending: All fields are pending
 * - partially_approved: Some fields approved/rejected, some pending
 * - completed: All fields approved or rejected (no pending fields)
 * - cancelled: Request was cancelled
 */
export function computeRequestStatus(fields, isCancelled = false) {
  if (isCancelled) return 'cancelled';
  if (!fields || fields.length === 0) return 'pending';

  const pendingCount = fields.filter(f => f.status === 'pending').length;
  const approvedCount = fields.filter(f => f.status === 'approved').length;
  const rejectedCount = fields.filter(f => f.status === 'rejected').length;

  if (pendingCount === fields.length) return 'pending';
  if (pendingCount === 0) return 'completed';
  return 'partially_approved';
}

/**
 * Build a new change request document for insertion into MongoDB.
 * Supports both single field (legacy) and multiple fields (new).
 *
 * @param {object} params
 * @param {string} params.companyId
 * @param {string} params.employeeId - employeeId string (e.g. "EMP-1234")
 * @param {import('mongodb').ObjectId} params.employeeObjectId
 * @param {string} params.employeeName
 * @param {string} params.requestType
 * @param {Array} params.fields - Array of { field, label, oldValue, newValue }
 * @param {string} params.reason - employee reason for the change
 * @returns {object} MongoDB document ready to insert
 */
export function buildChangeRequestDocument({
  companyId,
  employeeId,
  employeeObjectId,
  employeeName,
  requestType,
  fields = [],
  reason,
  // Legacy single field support (for backward compatibility)
  fieldChanged,
  fieldLabel,
  oldValue,
  newValue,
}) {
  const now = new Date();

  // Support legacy single-field requests
  let requestFields = fields;
  if (!requestFields.length && fieldChanged) {
    requestFields = [{
      field: fieldChanged,
      label: fieldLabel || fieldChanged,
      oldValue: oldValue ?? null,
      newValue,
      status: 'pending',
      reviewNote: null,
      reviewedAt: null,
    }];
  }

  // Initialize all fields with pending status
  requestFields = requestFields.map(f => ({
    field: f.field,
    label: f.label || f.field,
    oldValue: f.oldValue ?? null,
    newValue: f.newValue,
    status: f.status || 'pending',
    reviewNote: f.reviewNote || null,
    reviewedAt: f.reviewedAt || null,
  }));

  // Populate legacy fields from first field
  const firstField = requestFields[0];

  return {
    companyId,
    employeeId,
    employeeObjectId,
    employeeName: employeeName || '',
    requestType: requestType || (requestFields.length > 1 ? 'multiple' : 'other'),
    fields: requestFields,
    // Legacy fields
    fieldChanged: firstField?.field || null,
    fieldLabel: firstField?.label || null,
    oldValue: firstField?.oldValue || null,
    newValue: firstField?.newValue || null,
    reason,
    status: computeRequestStatus(requestFields),
    requestedAt: now,
    reviewedBy: null,
    reviewerName: null,
    reviewedAt: null,
    reviewNote: null,
    // Cancellation
    cancelledBy: null,
    cancelledByName: null,
    cancelledAt: null,
    cancellationReason: null,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Update the overall status of a change request based on field statuses
 */
export function updateRequestStatus(changeRequest) {
  const isCancelled = !!changeRequest.cancelledAt;
  const newStatus = computeRequestStatus(changeRequest.fields, isCancelled);

  return {
    ...changeRequest,
    status: newStatus,
    updatedAt: new Date(),
  };
}
