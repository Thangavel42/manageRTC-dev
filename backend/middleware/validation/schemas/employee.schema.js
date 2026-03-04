/**
 * Employee Validation Schemas
 *
 * SECURITY FIX - Phase 3, Task 3.2
 * Created: 2026-03-02
 */

import Joi from 'joi';
import {
  objectIdSchema,
  paginationSchema,
  searchSchema,
  queryParamsSchema,
  emailSchema,
  phoneSchema,
  nameSchema,
  descriptionSchema,
  addressSchema,
  urlSchema
} from './common.schema.js';

/**
 * Employee statuses
 */
const employeeStatuses = [
  'active', 'probation', 'on_leave', 'resigned', 'terminated', 'inactive'
];

/**
 * Employment types
 */
const employmentTypes = [
  'full_time', 'part_time', 'contract', 'intern', 'consultant'
];

/**
 * Genders
 */
const genders = ['male', 'female', 'other', 'prefer_not_to_say'];

/**
 * Marital statuses
 */
const maritalStatuses = ['single', 'married', 'divorced', 'widowed'];

/**
 * Blood groups
 */
const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/**
 * Create employee schema
 */
export const createEmployeeSchema = Joi.object({
  // Personal Information
  firstName: nameSchema.required().messages({
    'any.required': 'First name is required'
  }),

  lastName: nameSchema.required().messages({
    'any.required': 'Last name is required'
  }),

  email: emailSchema.required().messages({
    'any.required': 'Email is required'
  }),

  phone: phoneSchema.optional(),

  gender: Joi.string()
    .valid(...genders)
    .optional()
    .messages({
      'any.only': 'Invalid gender value'
    }),

  dateOfBirth: Joi.date()
    .iso()
    .max('now')
    .optional()
    .messages({
      'date.max': 'Date of birth cannot be in the future'
    }),

  maritalStatus: Joi.string().valid(...maritalStatuses).optional(),
  bloodGroup: Joi.string().valid(...bloodGroups).optional(),

  // Employment Information
  employeeId: Joi.string()
    .trim()
    .pattern(/^[A-Z0-9-]+$/)
    .max(50)
    .optional()
    .messages({
      'string.pattern.base': 'Employee ID must contain only uppercase letters, numbers, and hyphens'
    }),

  departmentId: objectIdSchema.optional(),
  designationId: objectIdSchema.optional(),
  shiftId: objectIdSchema.optional(),
  reportingManagerId: objectIdSchema.optional(),

  employmentType: Joi.string()
    .valid(...employmentTypes)
    .default('full_time')
    .messages({
      'any.only': 'Invalid employment type'
    }),

  joiningDate: Joi.date()
    .iso()
    .max('now')
    .required()
    .messages({
      'any.required': 'Joining date is required',
      'date.max': 'Joining date cannot be in the future'
    }),

  probationEndDate: Joi.date()
    .iso()
    .min(Joi.ref('joiningDate'))
    .optional()
    .messages({
      'date.min': 'Probation end date must be after joining date'
    }),

  confirmationDate: Joi.date()
    .iso()
    .min(Joi.ref('joiningDate'))
    .optional()
    .messages({
      'date.min': 'Confirmation date must be after joining date'
    }),

  status: Joi.string()
    .valid(...employeeStatuses)
    .default('active')
    .messages({
      'any.only': 'Invalid employee status'
    }),

  // Contact Information
  personalEmail: emailSchema.optional(),
  emergencyContact: Joi.object({
    name: nameSchema.optional(),
    relationship: Joi.string().max(50).optional(),
    phone: phoneSchema.optional()
  }).optional(),

  currentAddress: addressSchema.optional(),
  permanentAddress: addressSchema.optional(),

  // Bank Details
  bankDetails: Joi.object({
    accountNumber: Joi.string().trim().max(50).optional(),
    ifscCode: Joi.string().trim().max(20).optional(),
    bankName: Joi.string().trim().max(100).optional(),
    branch: Joi.string().trim().max(100).optional()
  }).optional(),

  // Documents
  aadharNumber: Joi.string()
    .trim()
    .pattern(/^\d{12}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Aadhar number must be 12 digits'
    }),

  panNumber: Joi.string()
    .trim()
    .pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .uppercase()
    .optional()
    .messages({
      'string.pattern.base': 'Invalid PAN number format'
    }),

  passportNumber: Joi.string().trim().max(20).optional(),

  // Profile
  profileImage: urlSchema.optional(),
  bio: descriptionSchema.optional()
});

/**
 * Update employee schema
 * More restrictive - some fields cannot be updated directly
 */
export const updateEmployeeSchema = Joi.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  phone: phoneSchema.optional(),
  gender: Joi.string().valid(...genders).optional(),
  dateOfBirth: Joi.date().iso().max('now').optional(),
  maritalStatus: Joi.string().valid(...maritalStatuses).optional(),
  bloodGroup: Joi.string().valid(...bloodGroups).optional(),

  departmentId: objectIdSchema.optional(),
  designationId: objectIdSchema.optional(),
  shiftId: objectIdSchema.optional(),
  reportingManagerId: objectIdSchema.optional(),
  employmentType: Joi.string().valid(...employmentTypes).optional(),

  probationEndDate: Joi.date().iso().optional(),
  confirmationDate: Joi.date().iso().optional(),
  status: Joi.string().valid(...employeeStatuses).optional(),

  personalEmail: emailSchema.optional(),
  emergencyContact: Joi.object({
    name: nameSchema.optional(),
    relationship: Joi.string().max(50).optional(),
    phone: phoneSchema.optional()
  }).optional(),

  currentAddress: addressSchema.optional(),
  permanentAddress: addressSchema.optional(),

  // Bank details (full object required if updating)
  bankDetails: Joi.object({
    accountNumber: Joi.string().trim().max(50).optional(),
    ifscCode: Joi.string().trim().max(20).optional(),
    bankName: Joi.string().trim().max(100).optional(),
    branch: Joi.string().trim().max(100).optional()
  }).optional(),

  profileImage: urlSchema.optional(),
  bio: descriptionSchema.optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * Employee self-update schema (more restrictive)
 */
export const employeeSelfUpdateSchema = Joi.object({
  phone: phoneSchema.optional(),
  personalEmail: emailSchema.optional(),
  emergencyContact: Joi.object({
    name: nameSchema.optional(),
    relationship: Joi.string().max(50).optional(),
    phone: phoneSchema.optional()
  }).optional(),
  currentAddress: addressSchema.optional(),
  permanentAddress: addressSchema.optional(),
  profileImage: urlSchema.optional(),
  bio: descriptionSchema.optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * Employee query parameters schema
 */
export const employeeQuerySchema = queryParamsSchema.concat(
  Joi.object({
    departmentId: objectIdSchema.optional(),
    designationId: objectIdSchema.optional(),
    status: Joi.string().valid(...employeeStatuses, 'all').optional(),
    employmentType: Joi.string().valid(...employmentTypes, 'all').optional(),
    reportingManagerId: objectIdSchema.optional(),
    joinedAfter: Joi.date().iso().optional(),
    joinedBefore: Joi.date().iso().optional()
  })
);

/**
 * Employee status update schema
 */
export const employeeStatusUpdateSchema = Joi.object({
  status: Joi.string()
    .valid(...employeeStatuses)
    .required()
    .messages({
      'any.required': 'Status is required',
      'any.only': 'Invalid status value'
    }),

  reason: Joi.string()
    .trim()
    .min(10)
    .max(500)
    .when('status', {
      is: Joi.string().valid('resigned', 'terminated', 'inactive'),
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'any.required': 'Reason is required for this status change',
      'string.min': 'Reason must be at least 10 characters'
    }),

  effectiveDate: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.base': 'Effective date must be a valid date'
    })
});

/**
 * Employee image upload schema
 */
export const employeeImageUploadSchema = Joi.object({
  imageType: Joi.string()
    .valid('profile', 'document')
    .required()
    .messages({
      'any.required': 'Image type is required',
      'any.only': 'Image type must be profile or document'
    })
});
