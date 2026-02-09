/**
 * Employee Form Validation Utility
 * Shared validation logic for Add and Edit Employee forms
 */

export interface EmployeeFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  account: {
    role: string;
  };
  departmentId: string;
  designationId: string;
  dateOfJoining: string | null;
  gender: string;
  dateOfBirth: string | null;
  address?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  shiftId?: string;
  batchId?: string;
}

export interface ValidationErrors {
  [key: string]: string;
}

/**
 * Validates all required fields for employee forms
 * @param data - Employee form data to validate
 * @param selectedShiftAssignment - Current shift assignment selection
 * @returns Object containing validation errors (empty if no errors)
 */
export const validateEmployeeForm = (
  data: EmployeeFormData,
  selectedShiftAssignment?: { type: 'shift' | 'batch' | null; value: string }
): ValidationErrors => {
  const errors: ValidationErrors = {};

  // Required fields validation
  if (!data.firstName?.trim()) {
    errors.firstName = "First name is required";
  }

  if (!data.lastName?.trim()) {
    errors.lastName = "Last name is required";
  }

  if (!data.email?.trim()) {
    errors.email = "Email is required";
  }

  if (!data.phone?.trim()) {
    errors.phone = "Phone number is required";
  }

  if (!data.account?.role) {
    errors.role = "Role is required";
  }

  if (!data.departmentId) {
    errors.departmentId = "Department is required";
  }

  if (!data.designationId) {
    errors.designationId = "Designation is required";
  }

  if (!data.dateOfJoining) {
    errors.dateOfJoining = "Date of joining is required";
  }

  if (!data.gender) {
    errors.gender = "Gender is required";
  }

  if (!data.dateOfBirth) {
    errors.birthday = "Date of birth is required";
  }

  // Shift assignment validation
  // Either selectedShiftAssignment has a type, or data has shiftId/batchId
  const hasShiftAssignment =
    (selectedShiftAssignment && selectedShiftAssignment.type) ||
    data.shiftId ||
    data.batchId;

  if (!hasShiftAssignment) {
    errors.shiftAssignment = "Shift assignment is required (or select 'No Shift Assignment')";
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (data.email && !emailRegex.test(data.email)) {
    errors.email = "Please enter a valid email address";
  }

  // Note: Email availability check (duplicate detection) is performed separately
  // in the modal's handleFieldBlur and handleSubmit functions via checkEmailAvailability

  // Phone format validation
  const phoneRegex = /^\d{10,}$/;
  if (data.phone) {
    const cleanedPhone = data.phone.replace(/[\s-]/g, "");
    if (!phoneRegex.test(cleanedPhone)) {
      errors.phone = "Please enter a valid phone number (at least 10 digits)";
    }
  }

  return errors;
};

/**
 * Validates a single field
 * @param fieldName - Name of the field to validate
 * @param value - Value of the field
 * @param data - Complete form data for context
 * @returns Error message or null if valid
 */
export const validateSingleField = (
  fieldName: string,
  value: any,
  data?: Partial<EmployeeFormData>
): string | null => {
  switch (fieldName) {
    case "firstName":
      return !value || !value.trim() ? "First name is required" : null;

    case "lastName":
      return !value || !value.trim() ? "Last name is required" : null;

    case "email":
      if (!value || !value.trim()) {
        return "Email is required";
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return "Please enter a valid email address";
      }
      return null;

    case "phone":
      if (!value || !value.trim()) {
        return "Phone number is required";
      }
      const phoneRegex = /^\d{10,}$/;
      const cleanedPhone = value.replace(/[\s-]/g, "");
      if (!phoneRegex.test(cleanedPhone)) {
        return "Please enter a valid phone number (at least 10 digits)";
      }
      return null;

    case "role":
      return !value ? "Role is required" : null;

    case "departmentId":
      return !value ? "Department is required" : null;

    case "designationId":
      return !value ? "Designation is required" : null;

    case "dateOfJoining":
      return !value ? "Date of joining is required" : null;

    case "gender":
      return !value ? "Gender is required" : null;

    case "birthday":
      return !value ? "Date of birth is required" : null;

    default:
      return null;
  }
};

/**
 * Field labels for error messages
 */
export const FIELD_LABELS: Record<string, string> = {
  firstName: "First Name",
  lastName: "Last Name",
  email: "Email",
  phone: "Phone Number",
  role: "Role",
  departmentId: "Department",
  designationId: "Designation",
  dateOfJoining: "Date of Joining",
  gender: "Gender",
  birthday: "Date of Birth",
  shiftAssignment: "Shift Assignment",
};

/**
 * List of all required fields
 */
export const REQUIRED_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "role",
  "departmentId",
  "designationId",
  "dateOfJoining",
  "gender",
  "birthday",
  "shiftAssignment",
] as const;
