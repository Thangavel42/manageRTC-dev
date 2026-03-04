/**
 * Field Sanitization Utilities
 * Prevents mass assignment vulnerabilities by filtering update data
 *
 * SECURITY: Critical security module for preventing privilege escalation
 */

import { EMPLOYEE_PROFILE_FIELDS, PROTECTED_FIELDS, LEAVE_FIELDS, ATTENDANCE_FIELDS } from '../config/fieldWhitelists.js';

/**
 * Get nested property from object using dot notation
 * @param {Object} obj - Source object
 * @param {string} path - Dot-notation path (e.g., 'address.street')
 * @returns {*} Value at path or undefined
 *
 * @example
 * getNestedValue({ address: { street: '123 Main' } }, 'address.street')
 * // Returns: '123 Main'
 */
const getNestedValue = (obj, path) => {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === undefined || current === null) {
      return undefined;
    }
    current = current[part];
  }

  return current;
};

/**
 * Set nested property on object using dot notation
 * @param {Object} obj - Target object
 * @param {string} path - Dot-notation path
 * @param {*} value - Value to set
 *
 * @example
 * setNestedValue({}, 'address.street', '123 Main')
 * // Returns: { address: { street: '123 Main' } }
 */
const setNestedValue = (obj, path, value) => {
  const parts = path.split('.');
  const last = parts.pop();
  let current = obj;

  for (const part of parts) {
    if (!current[part] || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part];
  }

  current[last] = value;
};

/**
 * Sanitize employee update data based on user role
 * Filters out fields that the user is not allowed to update
 *
 * @param {Object} updateData - Raw update data from request body
 * @param {string} userRole - Role of the requesting user
 * @returns {Object} Sanitized data with only allowed fields
 *
 * @example
 * sanitizeEmployeeUpdate(
 *   { phone: '123', role: 'admin', salary: { basic: 999999 } },
 *   'employee'
 * )
 * // Returns: { phone: '123' }
 * // Blocked: role (privilege escalation), salary (unauthorized)
 */
export const sanitizeEmployeeUpdate = (updateData, userRole) => {
  if (!updateData || typeof updateData !== 'object') {
    return {};
  }

  // Get allowed fields for this role
  const allowedFields = EMPLOYEE_PROFILE_FIELDS[userRole] || EMPLOYEE_PROFILE_FIELDS.employee;

  const sanitized = {};
  const blockedFields = [];

  // Process each allowed field
  allowedFields.forEach((field) => {
    const value = getNestedValue(updateData, field);

    if (value !== undefined) {
      // Field exists in update data and is allowed
      setNestedValue(sanitized, field, value);
    }
  });

  // Log blocked fields for security monitoring
  Object.keys(updateData).forEach((key) => {
    if (PROTECTED_FIELDS.includes(key)) {
      blockedFields.push(key);
    } else if (!allowedFields.some(f => f === key || f.startsWith(key + '.'))) {
      // Check if this field or its parent is in allowed list
      const hasNestedAllowed = allowedFields.some(f => f.startsWith(key + '.'));
      if (!hasNestedAllowed) {
        blockedFields.push(key);
      }
    }
  });

  if (blockedFields.length > 0) {
    console.warn(`[Security] Blocked fields in employee update (role: ${userRole}):`, blockedFields);
  }

  return sanitized;
};

/**
 * Remove protected fields from update data
 * Ensures system-critical fields are never modified via API
 *
 * @param {Object} updateData - Update data from request
 * @returns {Object} Data with protected fields removed
 *
 * @example
 * removeProtectedFields({ phone: '123', _id: 'malicious', role: 'admin' })
 * // Returns: { phone: '123' }
 */
export const removeProtectedFields = (updateData) => {
  if (!updateData || typeof updateData !== 'object') {
    return updateData;
  }

  const sanitized = { ...updateData };
  const removedFields = [];

  PROTECTED_FIELDS.forEach((field) => {
    if (sanitized[field] !== undefined) {
      delete sanitized[field];
      removedFields.push(field);
    }
  });

  if (removedFields.length > 0) {
    console.warn('[Security] Removed protected fields from update:', removedFields);
  }

  return sanitized;
};

/**
 * Sanitize leave request data based on user role
 *
 * @param {Object} leaveData - Leave request data
 * @param {string} userRole - Role of requesting user
 * @returns {Object} Sanitized leave data
 */
export const sanitizeLeaveUpdate = (leaveData, userRole) => {
  if (!leaveData || typeof leaveData !== 'object') {
    return {};
  }

  const allowedFields = LEAVE_FIELDS[userRole] || LEAVE_FIELDS.employee;
  const sanitized = {};
  const blockedFields = [];

  allowedFields.forEach((field) => {
    if (leaveData[field] !== undefined) {
      sanitized[field] = leaveData[field];
    }
  });

  // Log blocked fields
  Object.keys(leaveData).forEach((key) => {
    if (!allowedFields.includes(key) && leaveData[key] !== undefined) {
      blockedFields.push(key);
    }
  });

  if (blockedFields.length > 0) {
    console.warn(`[Security] Blocked fields in leave update (role: ${userRole}):`, blockedFields);
  }

  return sanitized;
};

/**
 * Sanitize attendance data based on user role
 *
 * @param {Object} attendanceData - Attendance data
 * @param {string} userRole - Role of requesting user
 * @returns {Object} Sanitized attendance data
 */
export const sanitizeAttendanceUpdate = (attendanceData, userRole) => {
  if (!attendanceData || typeof attendanceData !== 'object') {
    return {};
  }

  const allowedFields = ATTENDANCE_FIELDS[userRole] || ATTENDANCE_FIELDS.employee;
  const sanitized = {};
  const blockedFields = [];

  allowedFields.forEach((field) => {
    if (attendanceData[field] !== undefined) {
      sanitized[field] = attendanceData[field];
    }
  });

  // Log blocked fields
  Object.keys(attendanceData).forEach((key) => {
    if (!allowedFields.includes(key) && attendanceData[key] !== undefined) {
      blockedFields.push(key);
    }
  });

  if (blockedFields.length > 0) {
    console.warn(`[Security] Blocked fields in attendance update (role: ${userRole}):`, blockedFields);
  }

  return sanitized;
};

/**
 * Validate that update contains at least one allowed field
 * Prevents empty updates that might bypass validation
 *
 * @param {Object} sanitizedData - Data after sanitization
 * @throws {Error} If no valid fields to update
 */
export const validateHasFields = (sanitizedData) => {
  if (!sanitizedData || typeof sanitizedData !== 'object') {
    throw new Error('No valid fields to update');
  }

  const hasFields = Object.keys(sanitizedData).length > 0;

  if (!hasFields) {
    throw new Error('No valid fields to update');
  }
};

/**
 * Check if user has permission to update specific field
 * Useful for fine-grained validation
 *
 * @param {string} field - Field name
 * @param {string} userRole - User's role
 * @param {string} entityType - Entity type ('employee', 'leave', 'attendance')
 * @returns {boolean} True if user can update this field
 */
export const canUpdateField = (field, userRole, entityType = 'employee') => {
  let allowedFields;

  switch (entityType) {
    case 'employee':
      allowedFields = EMPLOYEE_PROFILE_FIELDS[userRole] || EMPLOYEE_PROFILE_FIELDS.employee;
      break;
    case 'leave':
      allowedFields = LEAVE_FIELDS[userRole] || LEAVE_FIELDS.employee;
      break;
    case 'attendance':
      allowedFields = ATTENDANCE_FIELDS[userRole] || ATTENDANCE_FIELDS.employee;
      break;
    default:
      return false;
  }

  // Check if field is in allowed list
  return allowedFields.includes(field);
};

/**
 * Get list of fields user can update
 * Useful for generating form fields dynamically
 *
 * @param {string} userRole - User's role
 * @param {string} entityType - Entity type
 * @returns {Array<string>} List of allowed field names
 */
export const getAllowedFields = (userRole, entityType = 'employee') => {
  switch (entityType) {
    case 'employee':
      return EMPLOYEE_PROFILE_FIELDS[userRole] || EMPLOYEE_PROFILE_FIELDS.employee;
    case 'leave':
      return LEAVE_FIELDS[userRole] || LEAVE_FIELDS.employee;
    case 'attendance':
      return ATTENDANCE_FIELDS[userRole] || ATTENDANCE_FIELDS.employee;
    default:
      return [];
  }
};

export default {
  sanitizeEmployeeUpdate,
  removeProtectedFields,
  sanitizeLeaveUpdate,
  sanitizeAttendanceUpdate,
  validateHasFields,
  canUpdateField,
  getAllowedFields,
};
