/**
 * Field Permissions Configuration
 * Defines what fields can be viewed and edited by each role
 */

export interface FieldPermission {
  view: boolean;
  edit: boolean;
}

export interface RolePermissions {
  [field: string]: FieldPermission;
}

/**
 * Complete field permissions for all roles
 * Format: { view: boolean, edit: boolean }
 */
export const FIELD_PERMISSIONS: Record<string, RolePermissions> = {
  superadmin: {
    // ========== Basic Information ==========
    firstName: { view: true, edit: true },
    lastName: { view: true, edit: true },
    email: { view: true, edit: true },
    phone: { view: true, edit: true },
    employeeId: { view: true, edit: false },

    // ========== Personal Information ==========
    dateOfBirth: { view: true, edit: true },
    gender: { view: true, edit: true },
    'personal.passport.number': { view: true, edit: true },
    'personal.passport.expiryDate': { view: true, edit: true },
    'personal.passport.country': { view: true, edit: true },
    'personal.nationality': { view: true, edit: true },
    'personal.religion': { view: true, edit: true },
    'personal.maritalStatus': { view: true, edit: true },
    'personal.employmentOfSpouse': { view: true, edit: true },
    'personal.noOfChildren': { view: true, edit: true },

    // ========== Professional Information ==========
    joiningDate: { view: true, edit: false },
    department: { view: false, edit: false },
    designation: { view: false, edit: false },
    role: { view: true, edit: false },
    employmentType: { view: false, edit: false },
    status: { view: false, edit: false },
    reportingTo: { view: false, edit: false },
    confirmationDate: { view: false, edit: false },
    resignationDate: { view: false, edit: false },
    lastWorkingDate: { view: false, edit: false },

    // ========== Address ==========
    'address.street': { view: true, edit: true },
    'address.city': { view: true, edit: true },
    'address.state': { view: true, edit: true },
    'address.country': { view: true, edit: true },
    'address.postalCode': { view: true, edit: true },

    // ========== Emergency Contact ==========
    'emergencyContact.name': { view: true, edit: true },
    'emergencyContact.phone': { view: true, edit: true },
    'emergencyContact.relationship': { view: true, edit: true },

    // ========== Bank Information ==========
    'bankDetails.bankName': { view: true, edit: true },
    'bankDetails.accountNumber': { view: true, edit: true },
    'bankDetails.ifscCode': { view: true, edit: true },
    'bankDetails.branch': { view: true, edit: true },
    'bankDetails.accountType': { view: true, edit: true },

    // ========== Social Links ==========
    'socialLinks.linkedin': { view: true, edit: true },
    'socialLinks.twitter': { view: true, edit: true },
    'socialLinks.facebook': { view: true, edit: true },
    'socialLinks.instagram': { view: true, edit: true },

    // ========== Skills & Bio ==========
    skills: { view: true, edit: true },
    bio: { view: true, edit: true },
    about: { view: true, edit: true },

    // ========== Extended Information ==========
    qualifications: { view: true, edit: true },
    education: { view: true, edit: true },
    experience: { view: true, edit: true },
    family: { view: true, edit: true },
    documents: { view: true, edit: true }
  },

  admin: {
    // ========== Basic Information ==========
    firstName: { view: true, edit: true },
    lastName: { view: true, edit: true },
    email: { view: true, edit: true },
    phone: { view: true, edit: true },
    employeeId: { view: true, edit: false },

    // ========== Personal Information ==========
    dateOfBirth: { view: true, edit: true },
    gender: { view: true, edit: true },
    'personal.passport.number': { view: true, edit: true },
    'personal.passport.expiryDate': { view: true, edit: true },
    'personal.passport.country': { view: true, edit: true },
    'personal.nationality': { view: true, edit: true },
    'personal.religion': { view: true, edit: true },
    'personal.maritalStatus': { view: true, edit: true },
    'personal.employmentOfSpouse': { view: true, edit: true },
    'personal.noOfChildren': { view: true, edit: true },

    // ========== Professional Information ==========
    joiningDate: { view: true, edit: true },
    department: { view: true, edit: true },
    designation: { view: true, edit: true },
    role: { view: true, edit: true },
    employmentType: { view: true, edit: true },
    status: { view: true, edit: true },
    reportingTo: { view: true, edit: true },
    confirmationDate: { view: true, edit: true },
    resignationDate: { view: true, edit: true },
    lastWorkingDate: { view: true, edit: true },

    // ========== Address ==========
    'address.street': { view: true, edit: true },
    'address.city': { view: true, edit: true },
    'address.state': { view: true, edit: true },
    'address.country': { view: true, edit: true },
    'address.postalCode': { view: true, edit: true },

    // ========== Emergency Contact ==========
    'emergencyContact.name': { view: true, edit: true },
    'emergencyContact.phone': { view: true, edit: true },
    'emergencyContact.relationship': { view: true, edit: true },

    // ========== Bank Information ==========
    'bankDetails.bankName': { view: true, edit: true },
    'bankDetails.accountNumber': { view: true, edit: false }, // View only (masked)
    'bankDetails.ifscCode': { view: true, edit: true },
    'bankDetails.branch': { view: true, edit: true },
    'bankDetails.accountType': { view: true, edit: true },

    // ========== Social Links ==========
    'socialLinks.linkedin': { view: true, edit: true },
    'socialLinks.twitter': { view: true, edit: true },
    'socialLinks.facebook': { view: true, edit: true },
    'socialLinks.instagram': { view: true, edit: true },

    // ========== Skills & Bio ==========
    skills: { view: true, edit: true },
    bio: { view: true, edit: true },
    about: { view: true, edit: true },

    // ========== Extended Information ==========
    qualifications: { view: true, edit: true },
    education: { view: true, edit: true },
    experience: { view: true, edit: true },
    family: { view: true, edit: true },
    documents: { view: true, edit: true }
  },

  hr: {
    // HR has same permissions as Admin for employee data
    ...null as any // Will be populated same as admin
  },

  manager: {
    // ========== Basic Information ==========
    firstName: { view: true, edit: true },
    lastName: { view: true, edit: true },
    email: { view: true, edit: false }, // Read-only
    phone: { view: true, edit: true },
    employeeId: { view: true, edit: false },

    // ========== Personal Information ==========
    dateOfBirth: { view: true, edit: true },
    gender: { view: true, edit: true },
    'personal.passport.number': { view: true, edit: true },
    'personal.passport.expiryDate': { view: true, edit: true },
    'personal.passport.country': { view: true, edit: true },
    'personal.nationality': { view: true, edit: true },
    'personal.religion': { view: true, edit: true },
    'personal.maritalStatus': { view: true, edit: true },
    'personal.employmentOfSpouse': { view: true, edit: true },
    'personal.noOfChildren': { view: true, edit: true },

    // ========== Professional Information (View Only for others) ==========
    joiningDate: { view: true, edit: false },
    department: { view: true, edit: false },
    designation: { view: true, edit: false },
    role: { view: true, edit: false },
    employmentType: { view: true, edit: false },
    status: { view: true, edit: false },
    reportingTo: { view: true, edit: false },
    confirmationDate: { view: false, edit: false },
    resignationDate: { view: false, edit: false },
    lastWorkingDate: { view: false, edit: false },

    // ========== Address ==========
    'address.street': { view: true, edit: true },
    'address.city': { view: true, edit: true },
    'address.state': { view: true, edit: true },
    'address.country': { view: true, edit: true },
    'address.postalCode': { view: true, edit: true },

    // ========== Emergency Contact ==========
    'emergencyContact.name': { view: true, edit: true },
    'emergencyContact.phone': { view: true, edit: true },
    'emergencyContact.relationship': { view: true, edit: true },

    // ========== Bank Information ==========
    'bankDetails.bankName': { view: false, edit: false }, // Cannot view bank info
    'bankDetails.accountNumber': { view: false, edit: false },
    'bankDetails.ifscCode': { view: false, edit: false },
    'bankDetails.branch': { view: false, edit: false },
    'bankDetails.accountType': { view: false, edit: false },

    // ========== Social Links ==========
    'socialLinks.linkedin': { view: true, edit: true },
    'socialLinks.twitter': { view: true, edit: true },
    'socialLinks.facebook': { view: true, edit: true },
    'socialLinks.instagram': { view: true, edit: true },

    // ========== Skills & Bio ==========
    skills: { view: true, edit: true },
    bio: { view: true, edit: true },
    about: { view: true, edit: true },

    // ========== Extended Information ==========
    qualifications: { view: true, edit: true },
    education: { view: true, edit: true },
    experience: { view: true, edit: true },
    family: { view: false, edit: false }, // Private
    documents: { view: true, edit: true }
  },

  employee: {
    // ========== Basic Information ==========
    firstName: { view: true, edit: true },
    lastName: { view: true, edit: true },
    email: { view: true, edit: false }, // Read-only
    phone: { view: true, edit: true },
    employeeId: { view: true, edit: false },

    // ========== Personal Information ==========
    dateOfBirth: { view: true, edit: true },
    gender: { view: true, edit: true },
    'personal.passport.number': { view: true, edit: true },
    'personal.passport.expiryDate': { view: true, edit: true },
    'personal.passport.country': { view: true, edit: true },
    'personal.nationality': { view: true, edit: true },
    'personal.religion': { view: true, edit: true },
    'personal.maritalStatus': { view: true, edit: true },
    'personal.employmentOfSpouse': { view: true, edit: true },
    'personal.noOfChildren': { view: true, edit: true },

    // ========== Professional Information (View Only) ==========
    joiningDate: { view: true, edit: false },
    department: { view: true, edit: false },
    designation: { view: true, edit: false },
    role: { view: true, edit: false },
    employmentType: { view: true, edit: false },
    status: { view: true, edit: false },
    reportingTo: { view: true, edit: false },
    confirmationDate: { view: true, edit: false },
    resignationDate: { view: false, edit: false },
    lastWorkingDate: { view: false, edit: false },

    // ========== Address ==========
    'address.street': { view: true, edit: true },
    'address.city': { view: true, edit: true },
    'address.state': { view: true, edit: true },
    'address.country': { view: true, edit: true },
    'address.postalCode': { view: true, edit: true },

    // ========== Emergency Contact ==========
    'emergencyContact.name': { view: true, edit: true },
    'emergencyContact.phone': { view: true, edit: true },
    'emergencyContact.relationship': { view: true, edit: true },

    // ========== Bank Information ==========
    'bankDetails.bankName': { view: true, edit: true },
    'bankDetails.accountNumber': { view: true, edit: true },
    'bankDetails.ifscCode': { view: true, edit: true },
    'bankDetails.branch': { view: true, edit: true },
    'bankDetails.accountType': { view: true, edit: true },

    // ========== Social Links ==========
    'socialLinks.linkedin': { view: true, edit: true },
    'socialLinks.twitter': { view: true, edit: true },
    'socialLinks.facebook': { view: true, edit: true },
    'socialLinks.instagram': { view: true, edit: true },

    // ========== Skills & Bio ==========
    skills: { view: true, edit: true },
    bio: { view: true, edit: true },
    about: { view: true, edit: true },

    // ========== Extended Information ==========
    qualifications: { view: true, edit: true },
    education: { view: true, edit: true },
    experience: { view: true, edit: true },
    family: { view: true, edit: true },
    documents: { view: true, edit: true }
  }
};

// Copy admin permissions to hr (they have the same access)
FIELD_PERMISSIONS.hr = { ...FIELD_PERMISSIONS.admin };

// Lead has same permissions as manager
FIELD_PERMISSIONS.lead = { ...FIELD_PERMISSIONS.manager };

/**
 * Check if a field can be edited by a role
 * @param role - The user's role
 * @param field - The field name (supports nested fields like 'personal.passport.number')
 * @returns true if the field can be edited
 */
export function canEditField(role: string, field: string): boolean {
  const rolePerms = FIELD_PERMISSIONS[role];
  if (!rolePerms) return false;

  // Check exact field match first
  if (rolePerms[field]?.edit) return true;

  // Check nested field match
  const parts = field.split('.');
  if (parts.length > 1) {
    // Try to find a matching parent permission
    for (let i = parts.length; i > 0; i--) {
      const parent = parts.slice(0, i).join('.');
      if (rolePerms[parent]?.edit) return true;
    }
  }

  return false;
}

/**
 * Check if a field can be viewed by a role
 * @param role - The user's role
 * @param field - The field name
 * @returns true if the field can be viewed
 */
export function canViewField(role: string, field: string): boolean {
  const rolePerms = FIELD_PERMISSIONS[role];
  if (!rolePerms) return false;

  // Check exact field match first
  if (rolePerms[field]?.view) return true;

  // Check nested field match
  const parts = field.split('.');
  if (parts.length > 1) {
    for (let i = parts.length; i > 0; i--) {
      const parent = parts.slice(0, i).join('.');
      if (rolePerms[parent]?.view) return true;
    }
  }

  return false;
}

/**
 * Get all editable fields for a role
 * @param role - The user's role
 * @returns Array of field names that can be edited
 */
export function getEditableFields(role: string): string[] {
  const rolePerms = FIELD_PERMISSIONS[role];
  if (!rolePerms) return [];

  return Object.keys(rolePerms).filter(field => rolePerms[field].edit);
}

/**
 * Get all viewable fields for a role
 * @param role - The user's role
 * @returns Array of field names that can be viewed
 */
export function getViewableFields(role: string): string[] {
  const rolePerms = FIELD_PERMISSIONS[role];
  if (!rolePerms) return [];

  return Object.keys(rolePerms).filter(field => rolePerms[field].view);
}

/**
 * Filter an object based on role permissions
 * @param data - The data object to filter
 * @param role - The user's role
 * @param mode - 'view' or 'edit'
 * @returns Filtered object
 */
export function filterByPermissions<T extends Record<string, any>>(
  data: T,
  role: string,
  mode: 'view' | 'edit' = 'view'
): Partial<T> {
  const rolePerms = FIELD_PERMISSIONS[role];
  if (!rolePerms) return {};

  const permissionKey = mode;

  const result: Partial<T> = {};

  for (const [key, value] of Object.entries(data)) {
    // Check direct permission
    if (rolePerms[key]?.[permissionKey]) {
      result[key as keyof T] = value;
      continue;
    }

    // Check nested object permissions
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nestedResult: any = {};
      let hasPermission = false;

      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        const fullKey = `${key}.${nestedKey}`;
        if (rolePerms[fullKey]?.[permissionKey] || rolePerms[key]?.[permissionKey]) {
          nestedResult[nestedKey] = nestedValue;
          hasPermission = true;
        }
      }

      if (hasPermission) {
        result[key as keyof T] = nestedResult;
      }
    } else if (Array.isArray(value)) {
      // Arrays (education, experience, etc.) - check parent permission
      if (rolePerms[key]?.[permissionKey]) {
        result[key as keyof T] = value as T[keyof T];
      }
    }
  }

  return result;
}

/**
 * Check if role has full edit access (all fields)
 * @param role - The user's role
 * @returns true if role has full edit access
 */
export function hasFullEditAccess(role: string): boolean {
  return ['admin', 'hr'].includes(role);
}

/**
 * Check if role can edit other users' profiles
 * @param role - The user's role
 * @returns true if role can edit others
 */
export function canEditOthers(role: string): boolean {
  return ['admin', 'hr'].includes(role);
}
