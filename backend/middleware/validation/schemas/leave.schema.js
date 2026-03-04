/**
 * Leave Management Validation Schemas
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
  futureDateRangeSchema,
  descriptionSchema,
  statusSchema,
  positiveNumberSchema,
  queryParamsSchema
} from './common.schema.js';

/**
 * Leave type codes
 */
const leaveTypeCodes = [
  'earned', 'sick', 'casual', 'maternity', 'paternity',
  'bereavement', 'compensatory', 'lop', 'special'
];

/**
 * Leave statuses
 */
const leaveStatuses = [
  'pending', 'pending_manager', 'approved_manager', 'approved_hr',
  'approved', 'rejected', 'cancelled'
];

/**
 * Half-day types
 */
const halfDayTypes = ['first_half', 'second_half'];

/**
 * Create leave request schema
 */
export const createLeaveSchema = Joi.object({
  leaveType: Joi.string()
    .valid(...leaveTypeCodes)
    .required()
    .messages({
      'any.required': 'Leave type is required',
      'any.only': 'Invalid leave type'
    }),

  startDate: Joi.date()
    .iso()
    .min('now')
    .required()
    .messages({
      'any.required': 'Start date is required',
      'date.base': 'Start date must be a valid date',
      'date.format': 'Start date must be in ISO format',
      'date.min': 'Start date cannot be in the past'
    }),

  endDate: Joi.date()
    .iso()
    .min(Joi.ref('startDate'))
    .required()
    .messages({
      'any.required': 'End date is required',
      'date.base': 'End date must be a valid date',
      'date.format': 'End date must be in ISO format',
      'date.min': 'End date must be on or after start date'
    }),

  isHalfDay: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'isHalfDay must be a boolean'
    }),

  halfDayType: Joi.string()
    .valid(...halfDayTypes)
    .when('isHalfDay', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'any.required': 'Half-day type is required when isHalfDay is true',
      'any.only': 'Invalid half-day type (must be first_half or second_half)'
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

  attachments: Joi.array()
    .items(Joi.string().uri())
    .max(5)
    .optional()
    .messages({
      'array.max': 'Cannot attach more than 5 files'
    }),

  reportingManagerId: objectIdSchema.optional(),

  sendNotification: Joi.boolean().default(true).optional()
});

/**
 * Update leave request schema
 */
export const updateLeaveSchema = Joi.object({
  startDate: Joi.date().iso().min('now').optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  isHalfDay: Joi.boolean().optional(),
  halfDayType: Joi.string().valid(...halfDayTypes).optional(),
  reason: Joi.string().trim().min(10).max(500).optional(),
  attachments: Joi.array().items(Joi.string().uri()).max(5).optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * Approve/Reject leave schema
 */
export const leaveActionSchema = Joi.object({
  action: Joi.string()
    .valid('approve', 'reject')
    .required()
    .messages({
      'any.required': 'Action is required',
      'any.only': 'Action must be either approve or reject'
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
      'any.required': 'Rejection reason is required when rejecting leave',
      'string.min': 'Rejection reason must be at least 10 characters',
      'string.max': 'Rejection reason is too long (max 500 characters)'
    })
});

/**
 * Manager action schema (approve/forward)
 */
export const managerActionSchema = Joi.object({
  action: Joi.string()
    .valid('approve', 'forward', 'reject')
    .required()
    .messages({
      'any.required': 'Action is required',
      'any.only': 'Action must be approve, forward, or reject'
    }),

  remarks: Joi.string().trim().max(500).optional()
});

/**
 * Leave cancellation schema
 */
export const cancelLeaveSchema = Joi.object({
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
 * Leave attachment upload schema
 */
export const leaveAttachmentSchema = Joi.object({
  attachmentType: Joi.string()
    .valid('medical_certificate', 'travel_proof', 'other')
    .required()
    .messages({
      'any.required': 'Attachment type is required',
      'any.only': 'Invalid attachment type'
    }),

  description: descriptionSchema
});

/**
 * Leave query parameters schema
 */
export const leaveQuerySchema = queryParamsSchema.concat(
  Joi.object({
    leaveType: Joi.string().valid(...leaveTypeCodes).optional(),
    status: Joi.string().valid(...leaveStatuses, 'all').optional(),
    employeeId: Joi.string().trim().optional(),
    department: objectIdSchema.optional(),
    fromDate: Joi.date().iso().optional(),
    toDate: Joi.date().iso().min(Joi.ref('fromDate')).optional(),
    year: Joi.number().integer().min(2020).max(2050).optional(),
    month: Joi.number().integer().min(1).max(12).optional()
  })
);

/**
 * Leave balance query schema
 */
export const leaveBalanceQuerySchema = Joi.object({
  employeeId: Joi.string().trim().optional(),
  year: Joi.number().integer().min(2020).max(2050).optional()
});

/**
 * Leave carry forward config schema
 */
export const carryForwardConfigSchema = Joi.object({
  enabled: Joi.boolean().required(),
  maxDays: Joi.number().integer().min(0).max(365).optional(),
  expiryMonths: Joi.number().integer().min(1).max(12).optional(),
  carryForwardPercentage: Joi.number().min(0).max(100).optional()
}).messages({
  'any.required': 'Enabled status is required'
});

/**
 * Leave encashment schema
 */
export const leaveEncashmentSchema = Joi.object({
  leaveType: Joi.string().valid(...leaveTypeCodes).required(),
  days: positiveNumberSchema.max(365).required().messages({
    'any.required': 'Number of days is required',
    'number.max': 'Days cannot exceed 365'
  }),
  reason: Joi.string().trim().min(10).max(500).optional()
});

/**
 * Leave ledger initialization schema
 */
export const leaveLedgerInitSchema = Joi.object({
  employeeId: Joi.string().trim().required().messages({
    'any.required': 'Employee ID is required'
  }),
  financialYear: Joi.string()
    .pattern(/^\d{4}-\d{4}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Financial year must be in format YYYY-YYYY'
    })
});

/**
 * Leave sync attendance schema
 */
export const leaveSyncAttendanceSchema = Joi.object({
  fromDate: Joi.date().iso().required(),
  toDate: Joi.date().iso().min(Joi.ref('fromDate')).required()
}).messages({
  'any.required': 'Date range is required'
});
