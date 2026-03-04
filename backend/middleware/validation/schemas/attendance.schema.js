/**
 * Attendance Validation Schemas
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
 * Attendance statuses
 */
const attendanceStatuses = [
  'present', 'absent', 'half_day', 'on_leave', 'weekend', 'holiday', 'work_from_home'
];

/**
 * Regularization statuses
 */
const regularizationStatuses = [
  'pending', 'approved', 'rejected'
];

/**
 * Create attendance record schema
 */
export const createAttendanceSchema = Joi.object({
  employeeId: Joi.string()
    .trim()
    .required()
    .messages({
      'any.required': 'Employee ID is required',
      'string.empty': 'Employee ID cannot be empty'
    }),

  date: Joi.date()
    .iso()
    .max('now')
    .required()
    .messages({
      'any.required': 'Date is required',
      'date.base': 'Date must be a valid date',
      'date.max': 'Date cannot be in the future'
    }),

  clockInTime: Joi.date()
    .iso()
    .required()
    .messages({
      'any.required': 'Clock-in time is required',
      'date.base': 'Clock-in time must be a valid date'
    }),

  clockOutTime: Joi.date()
    .iso()
    .min(Joi.ref('clockInTime'))
    .optional()
    .messages({
      'date.base': 'Clock-out time must be a valid date',
      'date.min': 'Clock-out time must be after clock-in time'
    }),

  breakDuration: Joi.number()
    .min(0)
    .max(480)
    .default(0)
    .messages({
      'number.base': 'Break duration must be a number',
      'number.min': 'Break duration cannot be negative',
      'number.max': 'Break duration cannot exceed 8 hours (480 minutes)'
    }),

  hoursWorked: positiveNumberSchema.max(24).optional().messages({
    'number.max': 'Hours worked cannot exceed 24 hours'
  }),

  overtimeHours: Joi.number()
    .min(0)
    .max(24)
    .default(0)
    .messages({
      'number.min': 'Overtime hours cannot be negative',
      'number.max': 'Overtime hours cannot exceed 24 hours'
    }),

  status: Joi.string()
    .valid(...attendanceStatuses)
    .default('present')
    .messages({
      'any.only': 'Invalid attendance status'
    }),

  notes: descriptionSchema,

  location: Joi.object({
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional(),
    address: Joi.string().max(500).optional()
  }).optional()
});

/**
 * Bulk attendance creation schema
 */
export const bulkAttendanceSchema = Joi.object({
  attendances: Joi.array()
    .items(createAttendanceSchema)
    .min(1)
    .max(100)
    .required()
    .messages({
      'any.required': 'Attendances array is required',
      'array.min': 'At least one attendance record is required',
      'array.max': 'Cannot create more than 100 attendance records at once'
    })
});

/**
 * Update attendance schema
 */
export const updateAttendanceSchema = Joi.object({
  clockInTime: Joi.date().iso().optional(),
  clockOutTime: Joi.date().iso().optional(),
  breakDuration: Joi.number().min(0).max(480).optional(),
  hoursWorked: positiveNumberSchema.max(24).optional(),
  overtimeHours: Joi.number().min(0).max(24).optional(),
  status: Joi.string().valid(...attendanceStatuses).optional(),
  notes: descriptionSchema
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * Attendance regularization request schema
 */
export const attendanceRegularizationSchema = Joi.object({
  attendanceId: objectIdSchema.required().messages({
    'any.required': 'Attendance ID is required'
  }),

  clockInTime: Joi.date()
    .iso()
    .required()
    .messages({
      'any.required': 'Clock-in time is required',
      'date.base': 'Clock-in time must be a valid date'
    }),

  clockOutTime: Joi.date()
    .iso()
    .min(Joi.ref('clockInTime'))
    .required()
    .messages({
      'any.required': 'Clock-out time is required',
      'date.base': 'Clock-out time must be a valid date',
      'date.min': 'Clock-out time must be after clock-in time'
    }),

  reason: Joi.string()
    .trim()
    .min(10)
    .max(500)
    .required()
    .messages({
      'any.required': 'Reason for regularization is required',
      'string.min': 'Reason must be at least 10 characters',
      'string.max': 'Reason is too long (max 500 characters)'
    }),

  supportingDocuments: Joi.array()
    .items(Joi.string().uri())
    .max(3)
    .optional()
    .messages({
      'array.max': 'Cannot attach more than 3 supporting documents'
    })
});

/**
 * Approve/Reject regularization schema
 */
export const regularizationActionSchema = Joi.object({
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
      'any.required': 'Rejection reason is required when rejecting regularization',
      'string.min': 'Rejection reason must be at least 10 characters'
    })
});

/**
 * Attendance query parameters schema
 */
export const attendanceQuerySchema = queryParamsSchema.concat(
  Joi.object({
    employeeId: Joi.string().trim().optional(),
    department: objectIdSchema.optional(),
    status: Joi.string().valid(...attendanceStatuses, 'all').optional(),
    fromDate: Joi.date().iso().optional(),
    toDate: Joi.date().iso().min(Joi.ref('fromDate')).optional(),
    year: Joi.number().integer().min(2020).max(2050).optional(),
    month: Joi.number().integer().min(1).max(12).optional(),
    regularizationStatus: Joi.string().valid(...regularizationStatuses, 'all').optional()
  })
);

/**
 * Attendance report schema
 */
export const attendanceReportSchema = Joi.object({
  employeeId: Joi.string().trim().optional(),
  department: objectIdSchema.optional(),
  fromDate: Joi.date()
    .iso()
    .required()
    .messages({
      'any.required': 'From date is required'
    }),
  toDate: Joi.date()
    .iso()
    .min(Joi.ref('fromDate'))
    .required()
    .messages({
      'any.required': 'To date is required',
      'date.min': 'To date must be after from date'
    }),
  includeWeekends: Joi.boolean().default(false),
  includeHolidays: Joi.boolean().default(false),
  format: Joi.string().valid('json', 'pdf', 'excel').default('json')
});

/**
 * Attendance report by employee schema
 */
export const employeeAttendanceReportSchema = Joi.object({
  fromDate: Joi.date().iso().required(),
  toDate: Joi.date().iso().min(Joi.ref('fromDate')).required(),
  includeWeekends: Joi.boolean().default(false),
  includeHolidays: Joi.boolean().default(false)
});
