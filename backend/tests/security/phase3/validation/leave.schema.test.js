/**
 * Unit Tests for Leave Validation Schemas
 * Tests Phase 3, Task 3.6
 *
 * @jest-environment node
 */

import { describe, test, expect } from '@jest/globals';
import {
  createLeaveSchema,
  updateLeaveSchema,
  leaveActionSchema,
  managerActionSchema,
  cancelLeaveSchema,
  leaveAttachmentSchema,
  leaveQuerySchema,
  leaveBalanceQuerySchema,
  carryForwardConfigSchema,
  leaveEncashmentSchema
} from '../../../../middleware/validation/schemas/leave.schema.js';

describe('Leave Validation Schemas - Unit Tests', () => {

  // ============================================================================
  // CREATE LEAVE SCHEMA
  // ============================================================================

  describe('createLeaveSchema', () => {
    const validLeave = {
      leaveType: 'earned',
      startDate: '2026-06-01',
      endDate: '2026-06-05',
      isHalfDay: false,
      reason: 'Family vacation planned for 5 days'
    };

    test('should accept valid leave request', () => {
      const { error } = createLeaveSchema.validate(validLeave);
      expect(error).toBeUndefined();
    });

    test('should accept all valid leave types', () => {
      const types = ['earned', 'sick', 'casual', 'maternity', 'paternity',
                     'bereavement', 'compensatory', 'lop', 'special'];

      types.forEach(type => {
        const { error } = createLeaveSchema.validate({ ...validLeave, leaveType: type });
        expect(error).toBeUndefined();
      });
    });

    test('should reject invalid leave type', () => {
      const { error } = createLeaveSchema.validate({ ...validLeave, leaveType: 'invalid' });
      expect(error).toBeDefined();
      expect(error.message).toContain('Invalid leave type');
    });

    test('should require leave type', () => {
      const leave = { ...validLeave };
      delete leave.leaveType;
      const { error } = createLeaveSchema.validate(leave);
      expect(error).toBeDefined();
      expect(error.message).toContain('Leave type is required');
    });

    test('should require start date', () => {
      const leave = { ...validLeave };
      delete leave.startDate;
      const { error } = createLeaveSchema.validate(leave);
      expect(error).toBeDefined();
    });

    test('should require end date', () => {
      const leave = { ...validLeave };
      delete leave.endDate;
      const { error } = createLeaveSchema.validate(leave);
      expect(error).toBeDefined();
    });

    test('should reject end date before start date', () => {
      const { error } = createLeaveSchema.validate({
        ...validLeave,
        startDate: '2026-06-05',
        endDate: '2026-06-01'
      });
      expect(error).toBeDefined();
      expect(error.message).toContain('End date must be on or after start date');
    });

    test('should reject past start date', () => {
      const { error } = createLeaveSchema.validate({
        ...validLeave,
        startDate: '2020-01-01',
        endDate: '2020-01-05'
      });
      expect(error).toBeDefined();
      expect(error.message).toContain('Start date cannot be in the past');
    });

    test('should require halfDayType when isHalfDay is true', () => {
      const { error } = createLeaveSchema.validate({
        ...validLeave,
        isHalfDay: true
      });
      expect(error).toBeDefined();
      expect(error.message).toContain('Half-day type is required');
    });

    test('should accept first_half and second_half', () => {
      const firstHalf = createLeaveSchema.validate({
        ...validLeave,
        isHalfDay: true,
        halfDayType: 'first_half'
      });
      expect(firstHalf.error).toBeUndefined();

      const secondHalf = createLeaveSchema.validate({
        ...validLeave,
        isHalfDay: true,
        halfDayType: 'second_half'
      });
      expect(secondHalf.error).toBeUndefined();
    });

    test('should reject invalid halfDayType', () => {
      const { error } = createLeaveSchema.validate({
        ...validLeave,
        isHalfDay: true,
        halfDayType: 'invalid'
      });
      expect(error).toBeDefined();
    });

    test('should require reason', () => {
      const leave = { ...validLeave };
      delete leave.reason;
      const { error } = createLeaveSchema.validate(leave);
      expect(error).toBeDefined();
      expect(error.message).toContain('Reason is required');
    });

    test('should reject reason < 10 characters', () => {
      const { error } = createLeaveSchema.validate({
        ...validLeave,
        reason: 'Short'
      });
      expect(error).toBeDefined();
      expect(error.message).toContain('Reason must be at least 10 characters');
    });

    test('should reject reason > 500 characters', () => {
      const { error } = createLeaveSchema.validate({
        ...validLeave,
        reason: 'a'.repeat(501)
      });
      expect(error).toBeDefined();
    });

    test('should accept attachments array', () => {
      const { error } = createLeaveSchema.validate({
        ...validLeave,
        attachments: ['https://example.com/file1.pdf', 'https://example.com/file2.pdf']
      });
      expect(error).toBeUndefined();
    });

    test('should reject > 5 attachments', () => {
      const { error } = createLeaveSchema.validate({
        ...validLeave,
        attachments: new Array(6).fill('https://example.com/file.pdf')
      });
      expect(error).toBeDefined();
      expect(error.message).toContain('Cannot attach more than 5 files');
    });

    test('should set default isHalfDay to false', () => {
      const leave = { ...validLeave };
      delete leave.isHalfDay;
      const { value } = createLeaveSchema.validate(leave);
      expect(value.isHalfDay).toBe(false);
    });
  });

  // ============================================================================
  // UPDATE LEAVE SCHEMA
  // ============================================================================

  describe('updateLeaveSchema', () => {
    test('should accept partial updates', () => {
      const { error } = updateLeaveSchema.validate({
        reason: 'Updated reason for medical appointment'
      });
      expect(error).toBeUndefined();
    });

    test('should accept updating dates', () => {
      const { error } = updateLeaveSchema.validate({
        startDate: '2026-07-01',
        endDate: '2026-07-05'
      });
      expect(error).toBeUndefined();
    });

    test('should reject empty update', () => {
      const { error } = updateLeaveSchema.validate({});
      expect(error).toBeDefined();
      expect(error.message).toContain('At least one field must be provided');
    });

    test('should reject end date before start date', () => {
      const { error } = updateLeaveSchema.validate({
        startDate: '2026-07-05',
        endDate: '2026-07-01'
      });
      expect(error).toBeDefined();
    });
  });

  // ============================================================================
  // LEAVE ACTION SCHEMA (APPROVE/REJECT)
  // ============================================================================

  describe('leaveActionSchema', () => {
    test('should accept approve action', () => {
      const { error } = leaveActionSchema.validate({
        action: 'approve',
        remarks: 'Approved for family emergency'
      });
      expect(error).toBeUndefined();
    });

    test('should accept reject action', () => {
      const { error } = leaveActionSchema.validate({
        action: 'reject',
        rejectionReason: 'Not enough leave balance available'
      });
      expect(error).toBeUndefined();
    });

    test('should require action', () => {
      const { error } = leaveActionSchema.validate({
        remarks: 'Test'
      });
      expect(error).toBeDefined();
      expect(error.message).toContain('Action is required');
    });

    test('should reject invalid action', () => {
      const { error } = leaveActionSchema.validate({
        action: 'invalid'
      });
      expect(error).toBeDefined();
      expect(error.message).toContain('Action must be either approve or reject');
    });

    test('should require rejectionReason when rejecting', () => {
      const { error } = leaveActionSchema.validate({
        action: 'reject'
      });
      expect(error).toBeDefined();
      expect(error.message).toContain('Rejection reason is required');
    });

    test('should reject short rejection reason', () => {
      const { error } = leaveActionSchema.validate({
        action: 'reject',
        rejectionReason: 'Short'
      });
      expect(error).toBeDefined();
      expect(error.message).toContain('at least 10 characters');
    });

    test('should accept remarks for approve action', () => {
      const { error } = leaveActionSchema.validate({
        action: 'approve',
        remarks: 'Approved as per company policy'
      });
      expect(error).toBeUndefined();
    });
  });

  // ============================================================================
  // MANAGER ACTION SCHEMA
  // ============================================================================

  describe('managerActionSchema', () => {
    test('should accept approve action', () => {
      const { error } = managerActionSchema.validate({ action: 'approve' });
      expect(error).toBeUndefined();
    });

    test('should accept forward action', () => {
      const { error } = managerActionSchema.validate({ action: 'forward' });
      expect(error).toBeUndefined();
    });

    test('should accept reject action', () => {
      const { error } = managerActionSchema.validate({ action: 'reject' });
      expect(error).toBeUndefined();
    });

    test('should reject invalid action', () => {
      const { error } = managerActionSchema.validate({ action: 'invalid' });
      expect(error).toBeDefined();
      expect(error.message).toContain('approve, forward, or reject');
    });

    test('should accept optional remarks', () => {
      const { error } = managerActionSchema.validate({
        action: 'approve',
        remarks: 'Forwarding to HR for final approval'
      });
      expect(error).toBeUndefined();
    });
  });

  // ============================================================================
  // CANCEL LEAVE SCHEMA
  // ============================================================================

  describe('cancelLeaveSchema', () => {
    test('should accept valid cancellation', () => {
      const { error } = cancelLeaveSchema.validate({
        cancellationReason: 'Plans changed due to unexpected work commitment'
      });
      expect(error).toBeUndefined();
    });

    test('should require cancellation reason', () => {
      const { error } = cancelLeaveSchema.validate({});
      expect(error).toBeDefined();
      expect(error.message).toContain('Cancellation reason is required');
    });

    test('should reject short cancellation reason', () => {
      const { error } = cancelLeaveSchema.validate({
        cancellationReason: 'Short'
      });
      expect(error).toBeDefined();
      expect(error.message).toContain('at least 10 characters');
    });

    test('should reject long cancellation reason', () => {
      const { error } = cancelLeaveSchema.validate({
        cancellationReason: 'a'.repeat(501)
      });
      expect(error).toBeDefined();
    });
  });

  // ============================================================================
  // LEAVE ATTACHMENT SCHEMA
  // ============================================================================

  describe('leaveAttachmentSchema', () => {
    test('should accept medical certificate', () => {
      const { error } = leaveAttachmentSchema.validate({
        attachmentType: 'medical_certificate',
        description: 'Doctor consultation report'
      });
      expect(error).toBeUndefined();
    });

    test('should accept travel proof', () => {
      const { error } = leaveAttachmentSchema.validate({
        attachmentType: 'travel_proof'
      });
      expect(error).toBeUndefined();
    });

    test('should accept other type', () => {
      const { error } = leaveAttachmentSchema.validate({
        attachmentType: 'other'
      });
      expect(error).toBeUndefined();
    });

    test('should require attachment type', () => {
      const { error } = leaveAttachmentSchema.validate({});
      expect(error).toBeDefined();
    });

    test('should reject invalid attachment type', () => {
      const { error } = leaveAttachmentSchema.validate({
        attachmentType: 'invalid'
      });
      expect(error).toBeDefined();
    });
  });

  // ============================================================================
  // LEAVE QUERY SCHEMA
  // ============================================================================

  describe('leaveQuerySchema', () => {
    test('should accept pagination params', () => {
      const { error } = leaveQuerySchema.validate({
        page: 1,
        limit: 20
      });
      expect(error).toBeUndefined();
    });

    test('should accept leave type filter', () => {
      const { error } = leaveQuerySchema.validate({
        leaveType: 'earned'
      });
      expect(error).toBeUndefined();
    });

    test('should accept status filter', () => {
      const { error } = leaveQuerySchema.validate({
        status: 'approved'
      });
      expect(error).toBeUndefined();
    });

    test('should accept date range filter', () => {
      const { error } = leaveQuerySchema.validate({
        fromDate: '2026-01-01',
        toDate: '2026-12-31'
      });
      expect(error).toBeUndefined();
    });

    test('should accept year and month filter', () => {
      const { error } = leaveQuerySchema.validate({
        year: 2026,
        month: 6
      });
      expect(error).toBeUndefined();
    });

    test('should reject month < 1', () => {
      const { error } = leaveQuerySchema.validate({
        month: 0
      });
      expect(error).toBeDefined();
    });

    test('should reject month > 12', () => {
      const { error } = leaveQuerySchema.validate({
        month: 13
      });
      expect(error).toBeDefined();
    });
  });

  // ============================================================================
  // LEAVE BALANCE QUERY SCHEMA
  // ============================================================================

  describe('leaveBalanceQuerySchema', () => {
    test('should accept employee ID', () => {
      const { error } = leaveBalanceQuerySchema.validate({
        employeeId: 'EMP-1234'
      });
      expect(error).toBeUndefined();
    });

    test('should accept year filter', () => {
      const { error } = leaveBalanceQuerySchema.validate({
        year: 2026
      });
      expect(error).toBeUndefined();
    });

    test('should accept empty query', () => {
      const { error } = leaveBalanceQuerySchema.validate({});
      expect(error).toBeUndefined();
    });
  });

  // ============================================================================
  // CARRY FORWARD CONFIG SCHEMA
  // ============================================================================

  describe('carryForwardConfigSchema', () => {
    test('should accept enabled config', () => {
      const { error } = carryForwardConfigSchema.validate({
        enabled: true,
        maxDays: 10,
        expiryMonths: 6,
        carryForwardPercentage: 50
      });
      expect(error).toBeUndefined();
    });

    test('should accept disabled config', () => {
      const { error } = carryForwardConfigSchema.validate({
        enabled: false
      });
      expect(error).toBeUndefined();
    });

    test('should require enabled field', () => {
      const { error } = carryForwardConfigSchema.validate({});
      expect(error).toBeDefined();
    });

    test('should reject maxDays > 365', () => {
      const { error } = carryForwardConfigSchema.validate({
        enabled: true,
        maxDays: 366
      });
      expect(error).toBeDefined();
    });

    test('should reject expiryMonths > 12', () => {
      const { error } = carryForwardConfigSchema.validate({
        enabled: true,
        expiryMonths: 13
      });
      expect(error).toBeDefined();
    });

    test('should reject percentage > 100', () => {
      const { error } = carryForwardConfigSchema.validate({
        enabled: true,
        carryForwardPercentage: 101
      });
      expect(error).toBeDefined();
    });
  });

  // ============================================================================
  // LEAVE ENCASHMENT SCHEMA
  // ============================================================================

  describe('leaveEncashmentSchema', () => {
    test('should accept valid encashment request', () => {
      const { error } = leaveEncashmentSchema.validate({
        leaveType: 'earned',
        days: 10,
        reason: 'Encashing unused leave balance at end of year'
      });
      expect(error).toBeUndefined();
    });

    test('should require leave type', () => {
      const { error } = leaveEncashmentSchema.validate({
        days: 10
      });
      expect(error).toBeDefined();
    });

    test('should require days', () => {
      const { error } = leaveEncashmentSchema.validate({
        leaveType: 'earned'
      });
      expect(error).toBeDefined();
    });

    test('should reject days > 365', () => {
      const { error } = leaveEncashmentSchema.validate({
        leaveType: 'earned',
        days: 366
      });
      expect(error).toBeDefined();
    });

    test('should accept optional reason', () => {
      const { error } = leaveEncashmentSchema.validate({
        leaveType: 'earned',
        days: 10
      });
      expect(error).toBeUndefined();
    });
  });
});
