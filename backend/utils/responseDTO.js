/**
 * Response Data Transfer Objects (DTOs)
 *
 * SECURITY: Prevents sensitive data leakage by filtering API response fields
 * based on the requesting user's role and context (self vs other).
 *
 * Three DTO tiers:
 * - Reference DTO:  Minimal fields for embedding in other entities (projects, tasks, leaves)
 * - List DTO:       Fields for employee list/search endpoints, role-aware
 * - Detail DTO:     Fields for single-employee views, role-aware with self-access support
 */

/**
 * Fields that must NEVER appear in any API response.
 * These are internal system fields or auth identifiers.
 */
const NEVER_EXPOSE = [
  'clerkUserId',
  'account.password', // Only password is sensitive, not the entire account object
  'isDeleted',
  'deletedAt',
  'deletedBy',
  '__v',
];

/**
 * Pick specified keys from an object. Supports nested keys via dot notation
 * for top-level access only (e.g., 'personal.nationality').
 */
function pick(obj, keys) {
  if (!obj || typeof obj !== 'object') return {};
  const result = {};
  for (const key of keys) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Remove NEVER_EXPOSE fields from an object (shallow).
 * Special handling for nested paths like 'account.password'
 */
function stripSensitive(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const cleaned = { ...obj };
  for (const field of NEVER_EXPOSE) {
    if (field.includes('.')) {
      // Handle nested path like 'account.password'
      const [parent, child] = field.split('.');
      if (cleaned[parent] && typeof cleaned[parent] === 'object') {
        const parentObj = { ...cleaned[parent] };
        delete parentObj[child];
        cleaned[parent] = parentObj;
      }
    } else {
      // Handle top-level field
      delete cleaned[field];
    }
  }
  return cleaned;
}

// ─────────────────────────────────────────────────────────────────────────────
// REFERENCE DTO - Minimal fields for embedding in other entities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimal employee representation for embedding in projects, tasks, leaves.
 * @param {Object} employee - Raw employee document
 * @returns {Object} Minimal employee reference
 */
export function employeeReferenceDTO(employee) {
  if (!employee) return null;
  return {
    _id: employee._id?.toString?.() || employee._id,
    employeeId: employee.employeeId || '',
    firstName: employee.firstName || '',
    lastName: employee.lastName || '',
    fullName: employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
    profileImage: employee.profileImage || '',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// LIST DTO - For employee list/search endpoints
// ─────────────────────────────────────────────────────────────────────────────

/** Base fields visible to ALL authenticated roles in list views */
const LIST_BASE_FIELDS = [
  '_id', 'employeeId', 'firstName', 'lastName', 'fullName',
  'profileImage', 'email', 'department', 'departmentName',
  'designation', 'designationTitle', 'employmentType',
  'status', 'joiningDate', 'dateOfJoining', 'gender', 'departmentId', 'designationId',
  'role', 'phoneCode', 'phone', 'about', // Add about field for editing
];

/** Additional fields visible to HR+ in list views */
const LIST_HR_FIELDS = [
  'dateOfBirth', 'phone', 'reportingTo', 'reportingManager',
  'shiftId', 'batchId',
];

/** Additional fields visible to Admin/Superadmin in list views */
const LIST_ADMIN_FIELDS = [
  // Salary summary only (not full breakdown)
];

/**
 * Employee list item DTO - role-based field filtering.
 *
 * @param {Object} employee - Raw employee document (from aggregation pipeline)
 * @param {string} userRole - Role of the requesting user
 * @returns {Object} Filtered employee data for list views
 */
export function employeeListDTO(employee, userRole) {
  if (!employee) return null;

  const role = (userRole || 'employee').toLowerCase();

  // Start with base fields
  const result = pick(employee, LIST_BASE_FIELDS);

  // Map account.role to top-level role if role is not set
  if (!result.role && employee.account?.role) {
    result.role = employee.account.role;
  }

  // Map bio to about (frontend uses 'about', database stores as 'bio')
  if (!result.about && employee.bio) {
    result.about = employee.bio;
  }

  // Stringify _id
  if (result._id) {
    result._id = result._id.toString?.() || result._id;
  }

  // HR+ can see more fields
  if (['hr', 'admin', 'superadmin'].includes(role)) {
    const hrFields = pick(employee, LIST_HR_FIELDS);
    Object.assign(result, hrFields);

    // Full address for HR+ (needed for editing in modal)
    if (employee.address) {
      result.address = {
        street: employee.address.street || '',
        city: employee.address.city || '',
        state: employee.address.state || '',
        postalCode: employee.address.postalCode || '',
        country: employee.address.country || '',
      };
    }

    // Personal - nationality and marital status only
    if (employee.personal) {
      result.nationality = employee.personal.nationality || employee.nationality || '';
      result.maritalStatus = employee.personal.maritalStatus || employee.maritalStatus || '';
    } else {
      result.nationality = employee.nationality || '';
      result.maritalStatus = employee.maritalStatus || '';
    }
  }

  // Admin/Superadmin can see salary summary
  if (['admin', 'superadmin'].includes(role)) {
    if (employee.salary) {
      result.salary = {
        total: employee.salary.total || 0,
        CTC: employee.salary.CTC || 0,
        currency: employee.salary.currency || 'INR',
      };
    }
  }

  // Reporting manager - always sanitize to reference
  if (result.reportingTo && typeof result.reportingTo === 'object') {
    result.reportingTo = employeeReferenceDTO(result.reportingTo);
  }
  if (result.reportingManager && typeof result.reportingManager === 'object') {
    result.reportingManager = employeeReferenceDTO(result.reportingManager);
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// DETAIL DTO - For single-employee view endpoints
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Employee detail DTO - role-based with self-access support.
 *
 * @param {Object} employee - Raw employee document (from aggregation or findOne)
 * @param {string} userRole - Role of the requesting user
 * @param {boolean} isSelf - Whether the user is viewing their own profile
 * @returns {Object} Filtered employee data for detail views
 */
export function employeeDetailDTO(employee, userRole, isSelf = false) {
  if (!employee) return null;

  const role = (userRole || 'employee').toLowerCase();

  // Map account.role to top-level role before stripping (in case role is only in account)
  if (!employee.role && employee.account?.role) {
    employee.role = employee.account.role;
  }

  // Self-access: return everything except NEVER_EXPOSE fields
  if (isSelf) {
    const result = stripSensitive(employee);

    // Convert _id to string
    if (result._id) {
      result._id = result._id.toString?.() || result._id;
    }

    // Sanitize reporting manager if present
    if (result.reportingTo && typeof result.reportingTo === 'object') {
      result.reportingTo = employeeReferenceDTO(result.reportingTo);
    }
    if (result.reportingManager && typeof result.reportingManager === 'object') {
      result.reportingManager = employeeReferenceDTO(result.reportingManager);
    }

    return result;
  }

  // Admin/Superadmin: see everything except NEVER_EXPOSE
  if (['admin', 'superadmin'].includes(role)) {
    const result = stripSensitive(employee);

    if (result._id) {
      result._id = result._id.toString?.() || result._id;
    }

    // Sanitize reporting manager
    if (result.reportingTo && typeof result.reportingTo === 'object') {
      result.reportingTo = employeeReferenceDTO(result.reportingTo);
    }
    if (result.reportingManager && typeof result.reportingManager === 'object') {
      result.reportingManager = employeeReferenceDTO(result.reportingManager);
    }

    return result;
  }

  // HR: list fields + address, emergency contacts, documents, personal (no passport), account (no password)
  if (role === 'hr') {
    const result = employeeListDTO(employee, 'hr');

    // Full address for HR
    if (employee.address) {
      result.address = { ...employee.address };
    }

    // Emergency contacts
    result.emergencyContact = employee.emergencyContact || null;
    result.emergencyContacts = employee.emergencyContacts || null;

    // Documents
    result.documents = employee.documents || [];

    // Personal info (no passport for HR in detail view unless needed)
    if (employee.personal) {
      result.personal = {
        nationality: employee.personal.nationality || '',
        religion: employee.personal.religion || '',
        maritalStatus: employee.personal.maritalStatus || '',
        bloodGroup: employee.personal.bloodGroup || '',
        employmentOfSpouse: employee.personal.employmentOfSpouse || '',
        noOfChildren: employee.personal.noOfChildren || 0,
        passport: employee.personal.passport || null,
      };
    }

    // Education, experience, family
    result.education = employee.education || [];
    result.experience = employee.experience || [];
    result.family = employee.family || [];

    // About and skills (database uses 'about' field, not 'bio')
    result.about = employee.about || employee.bio || '';
    result.skills = employee.skills || [];
    result.socialProfiles = employee.socialProfiles || null;

    // Dates
    result.dateOfBirth = employee.dateOfBirth || null;
    result.createdAt = employee.createdAt || null;
    result.updatedAt = employee.updatedAt || null;

    // Account object (without password) - HR needs to see/edit role
    if (employee.account) {
      result.account = {
        userName: employee.account.userName || '',
        role: employee.account.role || 'employee',
      };
      // Explicitly exclude password
      delete result.account.password;
    }

    return result;
  }

  // Employee viewing another employee: list fields only
  return employeeListDTO(employee, 'employee');
}

export default {
  employeeReferenceDTO,
  employeeListDTO,
  employeeDetailDTO,
};
