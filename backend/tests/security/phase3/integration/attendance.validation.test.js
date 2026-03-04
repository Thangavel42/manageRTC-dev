/**
 * Integration Tests for Attendance Route Validation
 * Tests Phase 3, Task 3.7
 *
 * Tests that validation middleware correctly rejects invalid requests
 * and allows valid requests to proceed to controllers.
 *
 * @jest-environment node
 */

import { describe, test, expect } from '@jest/globals';

describe('Attendance Routes - Validation Integration Tests', () => {

  // ============================================================================
  // CREATE ATTENDANCE (CLOCK IN) VALIDATION
  // ============================================================================

  describe('POST /api/attendance - Clock In Validation', () => {
    const validClockIn = {
      employeeId: 'EMP-1234',
      date: '2026-03-02T00:00:00.000Z',
      clockInTime: '2026-03-02T09:00:00.000Z',
      location: {
        latitude: 12.9716,
        longitude: 77.5946
      }
    };

    test('should reject request without employeeId', () => {
      const invalidRequest = { ...validClockIn };
      delete invalidRequest.employeeId;

      expect(() => {
        const { createAttendanceSchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
        const { error } = createAttendanceSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/Employee ID is required/);
    });

    test('should reject request without date', () => {
      const invalidRequest = { ...validClockIn };
      delete invalidRequest.date;

      expect(() => {
        const { createAttendanceSchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
        const { error } = createAttendanceSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/Date is required/);
    });

    test('should reject request without clockInTime', () => {
      const invalidRequest = { ...validClockIn };
      delete invalidRequest.clockInTime;

      expect(() => {
        const { createAttendanceSchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
        const { error } = createAttendanceSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/Clock in time is required/);
    });

    test('should reject future date', () => {
      const invalidRequest = {
        ...validClockIn,
        date: '2030-01-01T00:00:00.000Z',
        clockInTime: '2030-01-01T09:00:00.000Z'
      };

      expect(() => {
        const { createAttendanceSchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
        const { error } = createAttendanceSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/Date cannot be in the future/);
    });

    test('should reject clockOutTime before clockInTime', () => {
      const invalidRequest = {
        ...validClockIn,
        clockOutTime: '2026-03-02T08:00:00.000Z' // Before 09:00
      };

      expect(() => {
        const { createAttendanceSchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
        const { error } = createAttendanceSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/Clock out time must be after clock in time/);
    });

    test('should reject excessive break duration (>8 hours)', () => {
      const invalidRequest = {
        ...validClockIn,
        breakDuration: 481 // 8 hours = 480 minutes
      };

      expect(() => {
        const { createAttendanceSchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
        const { error } = createAttendanceSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/Break duration cannot exceed 8 hours/);
    });

    test('should reject excessive hours worked (>24)', () => {
      const invalidRequest = {
        ...validClockIn,
        hoursWorked: 25
      };

      expect(() => {
        const { createAttendanceSchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
        const { error } = createAttendanceSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/Hours worked cannot exceed 24/);
    });

    test('should reject excessive overtime hours (>24)', () => {
      const invalidRequest = {
        ...validClockIn,
        overtimeHours: 25
      };

      expect(() => {
        const { createAttendanceSchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
        const { error } = createAttendanceSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/Overtime hours cannot exceed 24/);
    });

    test('should accept valid clock in request', () => {
      const { createAttendanceSchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
      const { error } = createAttendanceSchema.validate(validClockIn);
      expect(error).toBeUndefined();
    });

    test('should accept valid clock in/out request', () => {
      const validRequest = {
        ...validClockIn,
        clockOutTime: '2026-03-02T18:00:00.000Z',
        breakDuration: 60,
        hoursWorked: 8,
        overtimeHours: 0
      };

      const { createAttendanceSchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
      const { error } = createAttendanceSchema.validate(validRequest);
      expect(error).toBeUndefined();
    });
  });

  // ============================================================================
  // UPDATE ATTENDANCE (CLOCK OUT) VALIDATION
  // ============================================================================

  describe('PUT /api/attendance/:id - Clock Out Validation', () => {
    test('should reject request without clockOutTime', () => {
      const invalidRequest = {
        breakDuration: 30
      };

      expect(() => {
        const { updateAttendanceSchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
        const { error } = updateAttendanceSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/Clock out time is required/);
    });

    test('should reject negative break duration', () => {
      const invalidRequest = {
        clockOutTime: '2026-03-02T18:00:00.000Z',
        breakDuration: -10
      };

      expect(() => {
        const { updateAttendanceSchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
        const { error } = updateAttendanceSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow();
    });

    test('should accept valid clock out request', () => {
      const validRequest = {
        clockOutTime: '2026-03-02T18:00:00.000Z',
        breakDuration: 60,
        hoursWorked: 8
      };

      const { updateAttendanceSchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
      const { error } = updateAttendanceSchema.validate(validRequest);
      expect(error).toBeUndefined();
    });
  });

  // ============================================================================
  // BULK ATTENDANCE OPERATIONS VALIDATION
  // ============================================================================

  describe('POST /api/attendance/bulk - Bulk Operations Validation', () => {
    test('should reject empty operations array', () => {
      const invalidRequest = {
        operations: []
      };

      expect(() => {
        const { bulkAttendanceSchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
        const { error } = bulkAttendanceSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/At least one operation is required/);
    });

    test('should reject more than 100 operations', () => {
      const invalidRequest = {
        operations: new Array(101).fill({
          action: 'create',
          data: {
            employeeId: 'EMP-1234',
            date: '2026-03-02',
            clockInTime: '2026-03-02T09:00:00.000Z'
          }
        })
      };

      expect(() => {
        const { bulkAttendanceSchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
        const { error } = bulkAttendanceSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/Cannot process more than 100 operations/);
    });

    test('should reject invalid action type', () => {
      const invalidRequest = {
        operations: [{
          action: 'invalid_action',
          data: {
            employeeId: 'EMP-1234',
            date: '2026-03-02',
            clockInTime: '2026-03-02T09:00:00.000Z'
          }
        }]
      };

      expect(() => {
        const { bulkAttendanceSchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
        const { error } = bulkAttendanceSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow();
    });

    test('should accept valid bulk operations', () => {
      const validRequest = {
        operations: [
          {
            action: 'create',
            data: {
              employeeId: 'EMP-1234',
              date: '2026-03-02',
              clockInTime: '2026-03-02T09:00:00.000Z'
            }
          },
          {
            action: 'update',
            id: '507f1f77bcf86cd799439011',
            data: {
              clockOutTime: '2026-03-02T18:00:00.000Z'
            }
          }
        ]
      };

      const { bulkAttendanceSchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
      const { error } = bulkAttendanceSchema.validate(validRequest);
      expect(error).toBeUndefined();
    });
  });

  // ============================================================================
  // ATTENDANCE REGULARIZATION REQUEST VALIDATION
  // ============================================================================

  describe('POST /api/attendance/:id/request-regularization - Regularization Validation', () => {
    test('should reject request without reason', () => {
      const invalidRequest = {
        clockInTime: '2026-03-02T09:00:00.000Z'
      };

      expect(() => {
        const { attendanceRegularizationSchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
        const { error } = attendanceRegularizationSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/Reason is required/);
    });

    test('should reject short reason (<10 characters)', () => {
      const invalidRequest = {
        clockInTime: '2026-03-02T09:00:00.000Z',
        reason: 'Short'
      };

      expect(() => {
        const { attendanceRegularizationSchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
        const { error } = attendanceRegularizationSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/Reason must be at least 10 characters/);
    });

    test('should reject request without any time fields', () => {
      const invalidRequest = {
        reason: 'Forgot to clock in this morning'
      };

      expect(() => {
        const { attendanceRegularizationSchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
        const { error } = attendanceRegularizationSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/At least one time field must be provided/);
    });

    test('should accept valid regularization request', () => {
      const validRequest = {
        clockInTime: '2026-03-02T09:00:00.000Z',
        clockOutTime: '2026-03-02T18:00:00.000Z',
        reason: 'Forgot to clock in and out this morning'
      };

      const { attendanceRegularizationSchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
      const { error } = attendanceRegularizationSchema.validate(validRequest);
      expect(error).toBeUndefined();
    });
  });

  // ============================================================================
  // REGULARIZATION ACTION VALIDATION (APPROVE/REJECT)
  // ============================================================================

  describe('POST /api/attendance/:id/approve-regularization - Action Validation', () => {
    test('should reject request without action', () => {
      const invalidRequest = {
        remarks: 'Test'
      };

      expect(() => {
        const { regularizationActionSchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
        const { error } = regularizationActionSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/Action is required/);
    });

    test('should reject invalid action', () => {
      const invalidRequest = {
        action: 'invalid'
      };

      expect(() => {
        const { regularizationActionSchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
        const { error } = regularizationActionSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/Action must be either approve or reject/);
    });

    test('should require rejection reason when rejecting', () => {
      const invalidRequest = {
        action: 'reject'
      };

      expect(() => {
        const { regularizationActionSchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
        const { error } = regularizationActionSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/Rejection reason is required/);
    });

    test('should reject short rejection reason', () => {
      const invalidRequest = {
        action: 'reject',
        rejectionReason: 'Short'
      };

      expect(() => {
        const { regularizationActionSchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
        const { error } = regularizationActionSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/at least 10 characters/);
    });

    test('should accept approve action', () => {
      const validRequest = {
        action: 'approve',
        remarks: 'Approved for valid reason'
      };

      const { regularizationActionSchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
      const { error } = regularizationActionSchema.validate(validRequest);
      expect(error).toBeUndefined();
    });

    test('should accept reject action with reason', () => {
      const validRequest = {
        action: 'reject',
        rejectionReason: 'Insufficient proof of emergency provided'
      };

      const { regularizationActionSchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
      const { error } = regularizationActionSchema.validate(validRequest);
      expect(error).toBeUndefined();
    });
  });

  // ============================================================================
  // ATTENDANCE REPORT VALIDATION
  // ============================================================================

  describe('POST /api/attendance/report - Report Generation Validation', () => {
    test('should reject request without startDate', () => {
      const invalidRequest = {
        endDate: '2026-03-31',
        format: 'pdf'
      };

      expect(() => {
        const { attendanceReportSchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
        const { error } = attendanceReportSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/Start date is required/);
    });

    test('should reject request without endDate', () => {
      const invalidRequest = {
        startDate: '2026-03-01',
        format: 'pdf'
      };

      expect(() => {
        const { attendanceReportSchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
        const { error } = attendanceReportSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/End date is required/);
    });

    test('should reject endDate before startDate', () => {
      const invalidRequest = {
        startDate: '2026-03-31',
        endDate: '2026-03-01',
        format: 'pdf'
      };

      expect(() => {
        const { attendanceReportSchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
        const { error } = attendanceReportSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/End date must be on or after start date/);
    });

    test('should reject invalid report format', () => {
      const invalidRequest = {
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        format: 'invalid'
      };

      expect(() => {
        const { attendanceReportSchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
        const { error } = attendanceReportSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow();
    });

    test('should accept valid report request', () => {
      const validRequest = {
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        format: 'pdf',
        employeeIds: ['EMP-1234', 'EMP-5678'],
        includeLeaves: true,
        includeOvertime: true
      };

      const { attendanceReportSchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
      const { error } = attendanceReportSchema.validate(validRequest);
      expect(error).toBeUndefined();
    });
  });

  // ============================================================================
  // ATTENDANCE QUERY VALIDATION
  // ============================================================================

  describe('GET /api/attendance - Query Validation', () => {
    test('should reject page < 1', () => {
      const invalidQuery = { page: 0 };

      expect(() => {
        const { attendanceQuerySchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
        const { error } = attendanceQuerySchema.validate(invalidQuery);
        if (error) throw error;
      }).toThrow(/Page must be at least 1/);
    });

    test('should reject limit > 100', () => {
      const invalidQuery = { limit: 101 };

      expect(() => {
        const { attendanceQuerySchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
        const { error } = attendanceQuerySchema.validate(invalidQuery);
        if (error) throw error;
      }).toThrow(/Limit cannot exceed 100/);
    });

    test('should reject invalid status', () => {
      const invalidQuery = { status: 'invalid' };

      expect(() => {
        const { attendanceQuerySchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
        const { error } = attendanceQuerySchema.validate(invalidQuery);
        if (error) throw error;
      }).toThrow();
    });

    test('should accept valid query parameters', () => {
      const validQuery = {
        page: 1,
        limit: 20,
        status: 'present',
        fromDate: '2026-03-01',
        toDate: '2026-03-31',
        employeeId: 'EMP-1234'
      };

      const { attendanceQuerySchema } = require('../../../../middleware/validation/schemas/attendance.schema.js');
      const { error } = attendanceQuerySchema.validate(validQuery);
      expect(error).toBeUndefined();
    });
  });
});
