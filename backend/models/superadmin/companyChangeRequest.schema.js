/**
 * Company Change Request Schema
 * Tracks company-submitted requests to change sensitive company profile fields.
 * Changes to critical fields (billing, legal, classification) require super-admin approval before being applied.
 * This is NOT a Mongoose schema — it's a plain JS object used as documentation/validation reference
 * for the native MongoDB driver (following the multi-tenant db.js pattern in this project).
 *
 * Collection: 'companyChangeRequests' (stored in superadmin database)
 *
 * Supports multiple fields per request with individual field-level approval.
 */

/**
 * Company Change Request document structure:
 *
 * {
 *   _id: ObjectId (auto-generated),
 *   companyId: ObjectId (required) - reference to the company document,
 *   companyName: String - display name at time of request,
 *   requestedBy: String (required) - clerkUserId of the user who submitted the request,
 *   requestedByName: String - display name of requester,
 *
 *   requestType: String (required) - one of:
 *     'billing' | 'legal' | 'classification' | 'address' | 'contact' | 'multiple',
 *
 *   fields: [
 *     {
 *       field: String (required) - dot-notation path, e.g. "billingAddress.street",
 *       label: String - human-readable label, e.g. "Billing Street",
 *       oldValue: Mixed - snapshot of current value at time of request,
 *       newValue: Mixed (required) - the requested new value,
 *       status: String (default: 'pending') - 'pending' | 'approved' | 'rejected',
 *       reviewNote: String - review note for this specific field,
 *       reviewedAt: Date - when this field was reviewed
 *     }
 *   ],
 *
 *   reason: String (required, min 5 chars) - requester-provided reason for the change,
 *
 *   // Overall request status (computed from field statuses)
 *   status: String (default: 'pending') - one of: 'pending' | 'partially_approved' | 'completed' | 'cancelled',
 *
 *   // Request-level review info
 *   reviewedBy: String - clerkUserId of the reviewer,
 *   reviewerName: String - display name of reviewer,
 *   reviewedAt: Date,
 *
 *   // Cancellation
 *   cancelledBy: String - clerkUserId of user who cancelled,
 *   cancelledByName: String,
 *   cancelledAt: Date,
 *   cancellationReason: String,
 *
 *   isDeleted: Boolean (default: false),
 *   createdAt: Date,
 *   updatedAt: Date
 * }
 */

export const COMPANY_CHANGE_REQUEST_TYPES = [
  'billing',
  'legal',
  'classification',
  'address',
  'contact',
  'multiple', // For requests spanning multiple categories
];

export const COMPANY_CHANGE_REQUEST_STATUSES = ['pending', 'partially_approved', 'completed', 'cancelled'];

export const COMPANY_FIELD_STATUSES = ['pending', 'approved', 'rejected'];

/**
 * Map of all Tier 3 company fields that require change-request approval.
 * Keys are dot-notation field paths; values are human-readable labels.
 */
export const ALLOWED_COMPANY_CHANGE_FIELDS = new Map([
  // ── Billing ──
  ['billingEmail', 'Billing Email'],
  ['billingAddress.street', 'Billing Street'],
  ['billingAddress.city', 'Billing City'],
  ['billingAddress.state', 'Billing State'],
  ['billingAddress.postalCode', 'Billing Postal Code'],
  ['billingAddress.country', 'Billing Country'],

  // ── Address / Structured Address ──
  ['address', 'Address'],
  ['structuredAddress.street', 'Street'],
  ['structuredAddress.city', 'City'],
  ['structuredAddress.state', 'State'],
  ['structuredAddress.postalCode', 'Postal Code'],
  ['structuredAddress.country', 'Country'],

  // ── Legal ──
  ['registrationNumber', 'Registration Number'],
  ['taxId', 'Tax ID'],
  ['taxIdType', 'Tax ID Type'],
  ['legalName', 'Legal Name'],
  ['legalEntityType', 'Legal Entity Type'],
  ['incorporationCountry', 'Incorporation Country'],

  // ── Classification ──
  ['industry', 'Industry'],
  ['subIndustry', 'Sub-Industry'],
  ['companySize', 'Company Size'],
  ['companyType', 'Company Type'],

  // ── Contact ──
  ['contactPerson.name', 'Contact Person Name'],
  ['contactPerson.email', 'Contact Person Email'],
  ['contactPerson.phone', 'Contact Person Phone'],
  ['contactPerson.designation', 'Contact Person Designation'],
  ['founderName', 'Founder Name'],
]);

/**
 * Compute overall request status based on field statuses.
 * - pending: All fields are pending
 * - partially_approved: Some fields approved/rejected, some still pending
 * - completed: All fields approved or rejected (no pending fields remain)
 * - cancelled: Request was cancelled
 *
 * @param {Array} fields - Array of field objects with a `status` property
 * @param {boolean} [isCancelled=false] - Whether the request has been cancelled
 * @returns {string} One of the COMPANY_CHANGE_REQUEST_STATUSES values
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
 * Build a new company change request document for insertion into MongoDB.
 *
 * @param {object} params
 * @param {import('mongodb').ObjectId} params.companyId - ObjectId of the company
 * @param {string} params.companyName - Company display name
 * @param {string} params.requestedBy - clerkUserId of the requester
 * @param {string} params.requestedByName - Display name of the requester
 * @param {string} params.requestType - One of COMPANY_CHANGE_REQUEST_TYPES
 * @param {Array} params.fields - Array of { field, label, oldValue, newValue }
 * @param {string} params.reason - Reason for the change (min 5 chars)
 * @returns {object} MongoDB document ready to insert
 */
export function buildCompanyChangeRequestDocument({
  companyId,
  companyName,
  requestedBy,
  requestedByName,
  requestType,
  fields = [],
  reason,
}) {
  const now = new Date();

  // Initialize all fields with pending status
  const requestFields = fields.map(f => ({
    field: f.field,
    label: f.label || f.field,
    oldValue: f.oldValue ?? null,
    newValue: f.newValue,
    status: f.status || 'pending',
    reviewNote: f.reviewNote || null,
    reviewedAt: f.reviewedAt || null,
  }));

  return {
    companyId,
    companyName: companyName || '',
    requestedBy,
    requestedByName: requestedByName || '',
    requestType: requestType || (requestFields.length > 1 ? 'multiple' : 'billing'),
    fields: requestFields,
    reason,
    status: computeRequestStatus(requestFields),
    reviewedBy: null,
    reviewerName: null,
    reviewedAt: null,
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
 * Update the overall status of a company change request based on field statuses.
 *
 * @param {object} changeRequest - The existing change request document
 * @returns {object} Updated change request document with recomputed status
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
