/**
 * Field Whitelists for Mass Assignment Prevention
 *
 * SECURITY: These whitelists define which fields users can update based on their role
 * Prevents privilege escalation and unauthorized data modification
 *
 * IMPORTANT: Any changes to these whitelists must be reviewed for security implications
 */

/**
 * Employee Profile Fields - Role-based access control
 */
export const EMPLOYEE_PROFILE_FIELDS = {
  /**
   * Fields that employees can update themselves
   * Limited to non-sensitive personal information
   */
  employee: [
    // Contact information
    'phone',

    // Address (nested fields)
    'address.street',
    'address.city',
    'address.state',
    'address.country',
    'address.postalCode',

    // Profile content
    'bio',
    'skills',

    // Social profiles
    'socialProfiles.linkedin',
    'socialProfiles.twitter',
    'socialProfiles.facebook',
    'socialProfiles.instagram',

    // Emergency contact
    'emergencyContact.name',
    'emergencyContact.phone',
    'emergencyContact.phone2',
    'emergencyContact.relationship',

    // Personal details (limited)
    'personal.maritalStatus',
    'personal.nationality',
    'personal.religion',
  ],

  /**
   * Fields that HR can update
   * Includes employee fields + employment-related fields
   */
  hr: [
    // All employee fields
    'phone',
    'address.street',
    'address.city',
    'address.state',
    'address.country',
    'address.postalCode',
    'bio',
    'skills',
    'socialProfiles.linkedin',
    'socialProfiles.twitter',
    'socialProfiles.facebook',
    'socialProfiles.instagram',
    'emergencyContact.name',
    'emergencyContact.phone',
    'emergencyContact.phone2',
    'emergencyContact.relationship',
    'personal.maritalStatus',
    'personal.nationality',
    'personal.religion',

    // Employment fields
    'department',
    'designation',
    'status',
    'reportingManager',
    'joiningDate',
    'dateOfJoining',
    'shiftId',
    'employmentType',

    // Extended personal info
    'dateOfBirth',
    'gender',
    'personal.bloodGroup',
    'personal.numberOfChildren',
    'personal.employmentOfSpouse',

    // Passport info
    'personal.passport.number',
    'personal.passport.issueDate',
    'personal.passport.expiryDate',
    'personal.passport.country',
  ],

  /**
   * Fields that admins can update
   * Includes HR fields + sensitive financial data
   */
  admin: [
    // All HR fields
    'phone',
    'address.street',
    'address.city',
    'address.state',
    'address.country',
    'address.postalCode',
    'bio',
    'skills',
    'socialProfiles.linkedin',
    'socialProfiles.twitter',
    'socialProfiles.facebook',
    'socialProfiles.instagram',
    'emergencyContact.name',
    'emergencyContact.phone',
    'emergencyContact.phone2',
    'emergencyContact.relationship',
    'personal.maritalStatus',
    'personal.nationality',
    'personal.religion',
    'department',
    'designation',
    'status',
    'reportingManager',
    'joiningDate',
    'dateOfJoining',
    'shiftId',
    'employmentType',
    'dateOfBirth',
    'gender',
    'personal.bloodGroup',
    'personal.numberOfChildren',
    'personal.employmentOfSpouse',
    'personal.passport.number',
    'personal.passport.issueDate',
    'personal.passport.expiryDate',
    'personal.passport.country',

    // Salary components
    'salary.basic',
    'salary.HRA',
    'salary.conveyanceAllowance',
    'salary.medicalAllowance',
    'salary.specialAllowance',
    'salary.DA',
    'salary.otherAllowance',
    'salary.total',
    'salary.CTC',

    // Bank details
    'bankDetails.accountHolderName',
    'bankDetails.bankName',
    'bankDetails.accountNumber',
    'bankDetails.ifscCode',
    'bankDetails.branch',
    'bankDetails.accountType',

    // Documents
    'documents.aadhar',
    'documents.pan',
    'documents.drivingLicense',
  ],
};

/**
 * Protected fields that should NEVER be updated via API
 * These fields are system-managed and critical for security
 *
 * CRITICAL: Allowing updates to these fields could lead to:
 * - Privilege escalation (role)
 * - Data integrity issues (_id, employeeId)
 * - Audit trail corruption (createdAt, createdBy)
 * - Authentication bypass (clerkUserId)
 */
export const PROTECTED_FIELDS = [
  // System identifiers
  '_id',
  'id',
  'employeeId',
  'clerkUserId',

  // Timestamps
  'createdAt',
  'createdBy',

  // Soft delete fields
  'isDeleted',
  'deletedAt',
  'deletedBy',

  // CRITICAL: Role determines permissions
  'role',

  // Metadata
  'metadata',
  'companyId',

  // Account linking
  'account.userId',
  'account.email',
];

/**
 * Leave request fields - Role-based access
 */
export const LEAVE_FIELDS = {
  /**
   * Fields employees can set when creating leave
   */
  employee: [
    'leaveType',
    'startDate',
    'endDate',
    'reason',
    'halfDay',
    'halfDayPeriod',
    'attachments',
  ],

  /**
   * Fields HR/Admin can update (includes approval fields)
   */
  hr: [
    'leaveType',
    'startDate',
    'endDate',
    'reason',
    'halfDay',
    'halfDayPeriod',
    'attachments',
    'status',
    'approverComments',
    'rejectionReason',
  ],
};

/**
 * Attendance fields - Role-based access
 */
export const ATTENDANCE_FIELDS = {
  /**
   * Fields employees can update
   */
  employee: [
    'clockInTime',
    'clockOutTime',
    'breakDuration',
    'notes',
  ],

  /**
   * Fields HR/Admin can update (includes regularization)
   */
  hr: [
    'clockInTime',
    'clockOutTime',
    'breakDuration',
    'notes',
    'status',
    'hoursWorked',
    'overtimeHours',
    'isRegularized',
    'regularizationReason',
  ],
};

/**
 * Project fields - Role-based access
 */
export const PROJECT_FIELDS = {
  /**
   * Fields that can be updated after creation
   */
  editable: [
    'name',
    'description',
    'status',
    'priority',
    'dueDate',
    'progress',
    'teamMembers',
    'teamLeader',
    'projectManager',
    'tags',
    'logo',
  ],

  /**
   * Protected project fields (set only on creation)
   */
  protected: [
    '_id',
    'projectId',
    'companyId',
    'createdBy',
    'createdAt',
    'isDeleted',
  ],
};

/**
 * Task fields - Role-based access
 */
export const TASK_FIELDS = {
  /**
   * Fields that assignees can update
   */
  assignee: [
    'status',
    'actualHours',
    'attachments',
  ],

  /**
   * Fields project managers can update
   */
  manager: [
    'title',
    'description',
    'status',
    'priority',
    'assignee',
    'dueDate',
    'estimatedHours',
    'actualHours',
    'tags',
    'attachments',
  ],

  /**
   * Protected task fields
   */
  protected: [
    '_id',
    'taskId',
    'projectId',
    'createdBy',
    'createdAt',
    'isDeleted',
  ],
};

/**
 * Employee Response Fields - Role-based OUTPUT filtering
 * Controls which fields are visible in API responses (data leakage prevention)
 *
 * SECURITY: These are for RESPONSE filtering (output), distinct from
 * EMPLOYEE_PROFILE_FIELDS which are for INPUT filtering (mass assignment).
 *
 * NEVER_EXPOSE fields (clerkUserId, account, isDeleted, etc.) are always
 * stripped by the DTO layer in backend/utils/responseDTO.js
 */
export const EMPLOYEE_RESPONSE_FIELDS = {
  /** Fields visible to any authenticated user in list/search views */
  listBase: [
    '_id', 'employeeId', 'firstName', 'lastName', 'fullName',
    'profileImage', 'email', 'department', 'departmentName',
    'designation', 'designationTitle', 'employmentType',
    'status', 'joiningDate', 'gender', 'departmentId', 'designationId',
  ],

  /** Additional list fields visible to HR/Admin/Superadmin */
  listHR: [
    'dateOfBirth', 'phone', 'reportingTo', 'reportingManager',
    'shiftId', 'batchId',
  ],

  /** Minimal fields for embedding in projects/tasks/leaves */
  reference: [
    '_id', 'employeeId', 'firstName', 'lastName', 'fullName', 'profileImage',
  ],

  /** Fields that should NEVER appear in any API response */
  neverExpose: [
    'clerkUserId', 'account', 'isDeleted', 'deletedAt', 'deletedBy', '__v',
  ],
};

export default {
  EMPLOYEE_PROFILE_FIELDS,
  PROTECTED_FIELDS,
  LEAVE_FIELDS,
  ATTENDANCE_FIELDS,
  PROJECT_FIELDS,
  TASK_FIELDS,
  EMPLOYEE_RESPONSE_FIELDS,
};
