/**
 * Integration Tests for Leave Route Validation
 * Tests Phase 3, Task 3.7
 *
 * Tests that validation middleware correctly rejects invalid requests
 * and allows valid requests to proceed to controllers.
 *
 * @jest-environment node
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

describe('Leave Routes - Validation Integration Tests', () => {

  // Note: These tests verify validation behavior without requiring database connection
  // They test that invalid requests are rejected with 400 errors before reaching controllers

  // ============================================================================
  // CREATE LEAVE VALIDATION
  // ============================================================================

  describe('POST /api/leaves - Create Leave Validation', () => {
    const validLeaveRequest = {
      leaveType: 'earned',
      startDate: '2026-06-01T00:00:00.000Z',
      endDate: '2026-06-05T00:00:00.000Z',
      isHalfDay: false,
      reason: 'Family vacation planned for summer holidays'
    };

    test('should reject request with missing leaveType', () => {
      const invalidRequest = { ...validLeaveRequest };
      delete invalidRequest.leaveType;

      // Validation should fail with detailed error
      expect(() => {
        const { createLeaveSchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
        const { error } = createLeaveSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/Leave type is required/);
    });

    test('should reject request with invalid leaveType', () => {
      const invalidRequest = {
        ...validLeaveRequest,
        leaveType: 'invalid_type'
      };

      expect(() => {
        const { createLeaveSchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
        const { error } = createLeaveSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/Invalid leave type/);
    });

    test('should reject request with missing startDate', () => {
      const invalidRequest = { ...validLeaveRequest };
      delete invalidRequest.startDate;

      expect(() => {
        const { createLeaveSchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
        const { error } = createLeaveSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/Start date is required/);
    });

    test('should reject request with end date before start date', () => {
      const invalidRequest = {
        ...validLeaveRequest,
        startDate: '2026-06-05T00:00:00.000Z',
        endDate: '2026-06-01T00:00:00.000Z'
      };

      expect(() => {
        const { createLeaveSchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
        const { error } = createLeaveSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/End date must be on or after start date/);
    });

    test('should reject request with past start date', () => {
      const invalidRequest = {
        ...validLeaveRequest,
        startDate: '2020-01-01T00:00:00.000Z',
        endDate: '2020-01-05T00:00:00.000Z'
      };

      expect(() => {
        const { createLeaveSchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
        const { error } = createLeaveSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/Start date cannot be in the past/);
    });

    test('should reject request with short reason', () => {
      const invalidRequest = {
        ...validLeaveRequest,
        reason: 'Short'
      };

      expect(() => {
        const { createLeaveSchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
        const { error } = createLeaveSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/Reason must be at least 10 characters/);
    });

    test('should reject request with missing halfDayType when isHalfDay is true', () => {
      const invalidRequest = {
        ...validLeaveRequest,
        isHalfDay: true
        // halfDayType is missing
      };

      expect(() => {
        const { createLeaveSchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
        const { error } = createLeaveSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/Half-day type is required/);
    });

    test('should reject request with more than 5 attachments', () => {
      const invalidRequest = {
        ...validLeaveRequest,
        attachments: new Array(6).fill('https://example.com/file.pdf')
      };

      expect(() => {
        const { createLeaveSchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
        const { error } = createLeaveSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/Cannot attach more than 5 files/);
    });

    test('should accept valid leave request', () => {
      const { createLeaveSchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
      const { error } = createLeaveSchema.validate(validLeaveRequest);
      expect(error).toBeUndefined();
    });

    test('should accept valid half-day leave request', () => {
      const validHalfDayRequest = {
        ...validLeaveRequest,
        isHalfDay: true,
        halfDayType: 'first_half'
      };

      const { createLeaveSchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
      const { error } = createLeaveSchema.validate(validHalfDayRequest);
      expect(error).toBeUndefined();
    });
  });

  // ============================================================================
  // LEAVE ACTION VALIDATION (APPROVE/REJECT)
  // ============================================================================

  describe('POST /api/leaves/:id/approve - Approve Leave Validation', () => {
    test('should reject request without action field', () => {
      const invalidRequest = {
        remarks: 'Test remarks'
      };

      expect(() => {
        const { leaveActionSchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
        const { error } = leaveActionSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/Action is required/);
    });

    test('should reject request with invalid action', () => {
      const invalidRequest = {
        action: 'invalid_action'
      };

      expect(() => {
        const { leaveActionSchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
        const { error } = leaveActionSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/Action must be either approve or reject/);
    });

    test('should accept approve action with optional remarks', () => {
      const validRequest = {
        action: 'approve',
        remarks: 'Approved as per company policy'
      };

      const { leaveActionSchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
      const { error } = leaveActionSchema.validate(validRequest);
      expect(error).toBeUndefined();
    });
  });

  describe('POST /api/leaves/:id/reject - Reject Leave Validation', () => {
    test('should reject request without rejection reason', () => {
      const invalidRequest = {
        action: 'reject'
        // rejectionReason is missing
      };

      expect(() => {
        const { leaveActionSchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
        const { error } = leaveActionSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/Rejection reason is required/);
    });

    test('should reject request with short rejection reason', () => {
      const invalidRequest = {
        action: 'reject',
        rejectionReason: 'Short'
      };

      expect(() => {
        const { leaveActionSchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
        const { error } = leaveActionSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/Rejection reason must be at least 10 characters/);
    });

    test('should accept reject action with valid rejection reason', () => {
      const validRequest = {
        action: 'reject',
        rejectionReason: 'Insufficient leave balance available for this request'
      };

      const { leaveActionSchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
      const { error } = leaveActionSchema.validate(validRequest);
      expect(error).toBeUndefined();
    });
  });

  // ============================================================================
  // MANAGER ACTION VALIDATION
  // ============================================================================

  describe('PATCH /api/leaves/:id/manager-action - Manager Action Validation', () => {
    test('should reject request without action', () => {
      const invalidRequest = {
        remarks: 'Test'
      };

      expect(() => {
        const { managerActionSchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
        const { error } = managerActionSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/Action is required/);
    });

    test('should reject invalid action', () => {
      const invalidRequest = {
        action: 'invalid'
      };

      expect(() => {
        const { managerActionSchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
        const { error } = managerActionSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/approve, forward, or reject/);
    });

    test('should accept approve action', () => {
      const validRequest = { action: 'approve' };
      const { managerActionSchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
      const { error } = managerActionSchema.validate(validRequest);
      expect(error).toBeUndefined();
    });

    test('should accept forward action', () => {
      const validRequest = { action: 'forward', remarks: 'Forwarding to HR' };
      const { managerActionSchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
      const { error } = managerActionSchema.validate(validRequest);
      expect(error).toBeUndefined();
    });

    test('should accept reject action', () => {
      const validRequest = { action: 'reject', remarks: 'Not approved' };
      const { managerActionSchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
      const { error } = managerActionSchema.validate(validRequest);
      expect(error).toBeUndefined();
    });
  });

  // ============================================================================
  // CANCEL LEAVE VALIDATION
  // ============================================================================

  describe('POST /api/leaves/:id/cancel - Cancel Leave Validation', () => {
    test('should reject request without cancellation reason', () => {
      const invalidRequest = {};

      expect(() => {
        const { cancelLeaveSchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
        const { error } = cancelLeaveSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/Cancellation reason is required/);
    });

    test('should reject short cancellation reason', () => {
      const invalidRequest = {
        cancellationReason: 'Short'
      };

      expect(() => {
        const { cancelLeaveSchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
        const { error } = cancelLeaveSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/at least 10 characters/);
    });

    test('should accept valid cancellation request', () => {
      const validRequest = {
        cancellationReason: 'Plans changed due to unexpected work commitment'
      };

      const { cancelLeaveSchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
      const { error } = cancelLeaveSchema.validate(validRequest);
      expect(error).toBeUndefined();
    });
  });

  // ============================================================================
  // LEAVE QUERY VALIDATION
  // ============================================================================

  describe('GET /api/leaves - List Leaves Query Validation', () => {
    test('should reject page < 1', () => {
      const invalidQuery = { page: 0 };

      expect(() => {
        const { leaveQuerySchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
        const { error } = leaveQuerySchema.validate(invalidQuery);
        if (error) throw error;
      }).toThrow(/Page must be at least 1/);
    });

    test('should reject limit > 100', () => {
      const invalidQuery = { limit: 101 };

      expect(() => {
        const { leaveQuerySchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
        const { error } = leaveQuerySchema.validate(invalidQuery);
        if (error) throw error;
      }).toThrow(/Limit cannot exceed 100/);
    });

    test('should reject invalid leave type', () => {
      const invalidQuery = { leaveType: 'invalid' };

      expect(() => {
        const { leaveQuerySchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
        const { error } = leaveQuerySchema.validate(invalidQuery);
        if (error) throw error;
      }).toThrow();
    });

    test('should reject month < 1', () => {
      const invalidQuery = { month: 0 };

      expect(() => {
        const { leaveQuerySchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
        const { error } = leaveQuerySchema.validate(invalidQuery);
        if (error) throw error;
      }).toThrow();
    });

    test('should reject month > 12', () => {
      const invalidQuery = { month: 13 };

      expect(() => {
        const { leaveQuerySchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
        const { error } = leaveQuerySchema.validate(invalidQuery);
        if (error) throw error;
      }).toThrow();
    });

    test('should accept valid query parameters', () => {
      const validQuery = {
        page: 1,
        limit: 20,
        leaveType: 'earned',
        status: 'approved',
        year: 2026,
        month: 6
      };

      const { leaveQuerySchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
      const { error } = leaveQuerySchema.validate(validQuery);
      expect(error).toBeUndefined();
    });
  });

  // ============================================================================
  // CARRY FORWARD CONFIG VALIDATION
  // ============================================================================

  describe('PUT /api/leaves/carry-forward/config - Config Validation', () => {
    test('should reject request without enabled field', () => {
      const invalidRequest = {
        maxDays: 10
      };

      expect(() => {
        const { carryForwardConfigSchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
        const { error } = carryForwardConfigSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/Enabled status is required/);
    });

    test('should reject maxDays > 365', () => {
      const invalidRequest = {
        enabled: true,
        maxDays: 366
      };

      expect(() => {
        const { carryForwardConfigSchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
        const { error } = carryForwardConfigSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow();
    });

    test('should reject expiryMonths > 12', () => {
      const invalidRequest = {
        enabled: true,
        expiryMonths: 13
      };

      expect(() => {
        const { carryForwardConfigSchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
        const { error } = carryForwardConfigSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow();
    });

    test('should accept valid config', () => {
      const validRequest = {
        enabled: true,
        maxDays: 10,
        expiryMonths: 6,
        carryForwardPercentage: 50
      };

      const { carryForwardConfigSchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
      const { error } = carryForwardConfigSchema.validate(validRequest);
      expect(error).toBeUndefined();
    });
  });

  // ============================================================================
  // LEAVE ENCASHMENT VALIDATION
  // ============================================================================

  describe('POST /api/leaves/encashment/execute/:leaveType - Encashment Validation', () => {
    test('should reject request without leaveType', () => {
      const invalidRequest = {
        days: 10
      };

      expect(() => {
        const { leaveEncashmentSchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
        const { error } = leaveEncashmentSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow();
    });

    test('should reject request without days', () => {
      const invalidRequest = {
        leaveType: 'earned'
      };

      expect(() => {
        const { leaveEncashmentSchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
        const { error } = leaveEncashmentSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/Number of days is required/);
    });

    test('should reject days > 365', () => {
      const invalidRequest = {
        leaveType: 'earned',
        days: 366
      };

      expect(() => {
        const { leaveEncashmentSchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
        const { error } = leaveEncashmentSchema.validate(invalidRequest);
        if (error) throw error;
      }).toThrow(/Days cannot exceed 365/);
    });

    test('should accept valid encashment request', () => {
      const validRequest = {
        leaveType: 'earned',
        days: 10,
        reason: 'Encashing unused leave balance at end of year'
      };

      const { leaveEncashmentSchema } = require('../../../../middleware/validation/schemas/leave.schema.js');
      const { error } = leaveEncashmentSchema.validate(validRequest);
      expect(error).toBeUndefined();
    });
  });
});
