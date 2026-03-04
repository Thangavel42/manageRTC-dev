/**
 * Overtime Validation Schemas
 *
 * SECURITY FIX - Phase 3, Task 3.2
 * Created: 2026-03-02
 */

import Joi from 'joi';
import {
  objectIdSchema,
  paginationSchema,
  searchSchema,
  dateRangeSchema,
  descriptionSchema,
  queryParamsSchema,
  positiveNumberSchema
} from './common.schema.js';

/**
 * Overtime statuses
 */
const overtimeStatuses = [
  'pending', 'pending_manager', 'approved_manager', 'approved_hr',
  'approved', 'rejected', 'cancelled', 'processed'
];

/**
 * Overtime types
 */
const overtimeTypes = [
  'regular', 'weekend', 'holiday', 'night_shift'
];

/**
 * Create overtime request schema
 */
export const createOvertimeSchema = Joi.object({
  date: Joi.date()
    .iso()
    .max('now')
    .required()
    .messages({
      'any.required': 'Date is required',
      'date.base': 'Date must be a valid date',
      'date.max': 'Date cannot be in the future'
    }),

  hours: Joi.number()
    .positive()
    .min(0.5)
    .max(12)
    .required()
    .messages({
      'any.required': 'Hours is required',
      'number.positive': 'Hours must be positive',
      'number.min': 'Minimum overtime is 0.5 hours',
      'number.max': 'Maximum overtime is 12 hours per day'
    }),

  overtimeType: Joi.string()
    .valid(...overtimeTypes)
    .default('regular')
    .messages({
      'any.only': 'Invalid overtime type'
    }),

  reason: Joi.string()
    .trim()
    .min(10)
    .max(500)
    .required()
    .messages({
      'any.required': 'Reason is required',
      'string.min': 'Reason must be at least 10 characters',
      'string.max': 'Reason is too long (max 500 characters)'
    }),

  taskDetails: descriptionSchema,

  projectId: objectIdSchema.optional(),

  attendanceId: objectIdSchema.optional(),

  supportingDocuments: Joi.array()
    .items(Joi.string().uri())
    .max(3)
    .optional()
    .messages({
      'array.max': 'Cannot attach more than 3 supporting documents'
    })
});

/**
 * Update overtime request schema
 */
export const updateOvertimeSchema = Joi.object({
  date: Joi.date().iso().max('now').optional(),
  hours: positiveNumberSchema.min(0.5).max(12).optional(),
  overtimeType: Joi.string().valid(...overtimeTypes).optional(),
  reason: Joi.string().trim().min(10).max(500).optional(),
  taskDetails: descriptionSchema,
  projectId: objectIdSchema.optional(),
  supportingDocuments: Joi.array().items(Joi.string().uri()).max(3).optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * Approve/Reject overtime schema
 */
export const overtimeActionSchema = Joi.object({
  action: Joi.string()
    .valid('approve', 'reject')
    .required()
    .messages({
      'any.required': 'Action is required',
      'any.only': 'Action must be either approve or reject'
    }),

  approvedHours: Joi.number()
    .positive()
    .max(12)
    .when('action', {
      is: 'approve',
      then: Joi.optional(),
      otherwise: Joi.forbidden()
    })
    .messages({
      'number.positive': 'Approved hours must be positive',
      'number.max': 'Approved hours cannot exceed 12 hours',
      'any.unknown': 'Approved hours can only be provided when approving'
    }),

  remarks: Joi.string()
    .trim()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Remarks is too long (max 500 characters)'
    }),

  rejectionReason: Joi.string()
    .trim()
    .min(10)
    .max(500)
    .when('action', {
      is: 'reject',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'any.required': 'Rejection reason is required when rejecting overtime',
      'string.min': 'Rejection reason must be at least 10 characters',
      'string.max': 'Rejection reason is too long (max 500 characters)'
    })
});

/**
 * Manager action schema (approve/forward/reject)
 */
export const overtimeManagerActionSchema = Joi.object({
  action: Joi.string()
    .valid('approve', 'forward', 'reject')
    .required()
    .messages({
      'any.required': 'Action is required',
      'any.only': 'Action must be approve, forward, or reject'
    }),

  approvedHours: Joi.number().positive().max(12).optional(),
  remarks: Joi.string().trim().max(500).optional()
});

/**
 * Cancel overtime request schema
 */
export const cancelOvertimeSchema = Joi.object({
  cancellationReason: Joi.string()
    .trim()
    .min(10)
    .max(500)
    .required()
    .messages({
      'any.required': 'Cancellation reason is required',
      'string.min': 'Cancellation reason must be at least 10 characters',
      'string.max': 'Cancellation reason is too long (max 500 characters)'
    })
});

/**
 * Overtime query parameters schema
 */
export const overtimeQuerySchema = queryParamsSchema.concat(
  Joi.object({
    employeeId: Joi.string().trim().optional(),
    department: objectIdSchema.optional(),
    status: Joi.string().valid(...overtimeStatuses, 'all').optional(),
    overtimeType: Joi.string().valid(...overtimeTypes, 'all').optional(),
    projectId: objectIdSchema.optional(),
    fromDate: Joi.date().iso().optional(),
    toDate: Joi.date().iso().min(Joi.ref('fromDate')).optional(),
    year: Joi.number().integer().min(2020).max(2050).optional(),
    month: Joi.number().integer().min(1).max(12).optional()
  })
);

/**
 * Overtime summary schema
 */
export const overtimeSummarySchema = Joi.object({
  employeeId: Joi.string().trim().optional(),
  department: objectIdSchema.optional(),
  fromDate: Joi.date().iso().required().messages({
    'any.required': 'From date is required'
  }),
  toDate: Joi.date().iso().min(Joi.ref('fromDate')).required().messages({
    'any.required': 'To date is required'
  }),
  groupBy: Joi.string().valid('employee', 'department', 'project', 'type').default('employee')
});

/**
 * Process overtime for payroll schema
 */
export const processOvertimeSchema = Joi.object({
  overtimeIds: Joi.array()
    .items(objectIdSchema)
    .min(1)
    .max(100)
    .required()
    .messages({
      'any.required': 'Overtime IDs are required',
      'array.min': 'At least one overtime ID is required',
      'array.max': 'Cannot process more than 100 overtime records at once'
    }),

  payrollMonth: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .required()
    .messages({
      'any.required': 'Payroll month is required'
    }),

  payrollYear: Joi.number()
    .integer()
    .min(2020)
    .max(2050)
    .required()
    .messages({
      'any.required': 'Payroll year is required'
    })
});
