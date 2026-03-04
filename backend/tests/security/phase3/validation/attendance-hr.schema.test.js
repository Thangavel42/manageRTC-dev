/**
 * Unit Tests for Attendance and HR Validation Schemas
 * Tests Phase 3, Task 3.6
 *
 * @jest-environment node
 */

import { describe, test, expect } from '@jest/globals';
import {
  createAttendanceSchema,
  bulkAttendanceSchema,
  updateAttendanceSchema,
  attendanceRegularizationSchema,
  regularizationActionSchema,
  attendanceQuerySchema
} from '../../../../middleware/validation/schemas/attendance.schema.js';

import {
  createDepartmentSchema,
  updateDepartmentSchema,
  createDesignationSchema,
  updateDesignationSchema,
  createHolidaySchema,
  updateHolidaySchema,
  validateHolidaySchema,
  calculateWorkingDaysSchema,
  createPolicySchema,
  updatePolicySchema
} from '../../../../middleware/validation/schemas/hr.schema.js';

describe('Attendance & HR Validation Schemas - Unit Tests', () => {

  // ============================================================================
  // ATTENDANCE SCHEMAS
  // ============================================================================

  describe('createAttendanceSchema', () => {
    const validAttendance = {
      employeeId: 'EMP-1234',
      date: '2026-03-01',
      clockInTime: '2026-03-01T09:00:00.000Z',
      clockOutTime: '2026-03-01T18:00:00.000Z',
      breakDuration: 60,
      hoursWorked: 8,
      overtimeHours: 0,
      status: 'present'
    };

    test('should accept valid attendance record', () => {
      const { error } = createAttendanceSchema.validate(validAttendance);
      expect(error).toBeUndefined();
    });

    test('should require employeeId', () => {
      const attendance = { ...validAttendance };
      delete attendance.employeeId;
      const { error } = createAttendanceSchema.validate(attendance);
      expect(error).toBeDefined();
    });

    test('should require date', () => {
      const attendance = { ...validAttendance };
      delete attendance.date;
      const { error } = createAttendanceSchema.validate(attendance);
      expect(error).toBeDefined();
    });

    test('should reject future date', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const { error } = createAttendanceSchema.validate({
        ...validAttendance,
        date: futureDate.toISOString()
      });
      expect(error).toBeDefined();
      expect(error.message).toContain('Date cannot be in the future');
    });

    test('should require clockInTime', () => {
      const attendance = { ...validAttendance };
      delete attendance.clockInTime;
      const { error } = createAttendanceSchema.validate(attendance);
      expect(error).toBeDefined();
    });

    test('should accept all valid attendance statuses', () => {
      const statuses = ['present', 'absent', 'half_day', 'on_leave', 'weekend', 'holiday', 'work_from_home'];

      statuses.forEach(status => {
        const { error } = createAttendanceSchema.validate({ ...validAttendance, status });
        expect(error).toBeUndefined();
      });
    });

    test('should reject break duration > 480 minutes (8 hours)', () => {
      const { error } = createAttendanceSchema.validate({
        ...validAttendance,
        breakDuration: 481
      });
      expect(error).toBeDefined();
      expect(error.message).toContain('Break duration cannot exceed 8 hours');
    });

    test('should reject hours worked > 24', () => {
      const { error } = createAttendanceSchema.validate({
        ...validAttendance,
        hoursWorked: 25
      });
      expect(error).toBeDefined();
    });

    test('should reject overtime hours > 24', () => {
      const { error } = createAttendanceSchema.validate({
        ...validAttendance,
        overtimeHours: 25
      });
      expect(error).toBeDefined();
    });

    test('should set default breakDuration to 0', () => {
      const attendance = { ...validAttendance };
      delete attendance.breakDuration;
      const { value } = createAttendanceSchema.validate(attendance);
      expect(value.breakDuration).toBe(0);
    });

    test('should accept location data', () => {
      const { error } = createAttendanceSchema.validate({
        ...validAttendance,
        location: {
          latitude: 12.9716,
          longitude: 77.5946,
          address: 'Bangalore, Karnataka, India'
        }
      });
      expect(error).toBeUndefined();
    });
  });

  describe('bulkAttendanceSchema', () => {
    const validBulk = {
      attendances: [
        {
          employeeId: 'EMP-1234',
          date: '2026-03-01',
          clockInTime: '2026-03-01T09:00:00.000Z',
          clockOutTime: '2026-03-01T18:00:00.000Z'
        },
        {
          employeeId: 'EMP-5678',
          date: '2026-03-01',
          clockInTime: '2026-03-01T09:00:00.000Z',
          clockOutTime: '2026-03-01T18:00:00.000Z'
        }
      ]
    };

    test('should accept valid bulk attendance', () => {
      const { error } = bulkAttendanceSchema.validate(validBulk);
      expect(error).toBeUndefined();
    });

    test('should require at least 1 attendance record', () => {
      const { error } = bulkAttendanceSchema.validate({ attendances: [] });
      expect(error).toBeDefined();
    });

    test('should reject > 100 attendance records', () => {
      const attendances = new Array(101).fill({
        employeeId: 'EMP-1234',
        date: '2026-03-01',
        clockInTime: '2026-03-01T09:00:00.000Z'
      });
      const { error } = bulkAttendanceSchema.validate({ attendances });
      expect(error).toBeDefined();
    });
  });

  describe('attendanceRegularizationSchema', () => {
    const validRegularization = {
      attendanceId: '507f1f77bcf86cd799439011',
      clockInTime: '2026-03-01T09:00:00.000Z',
      clockOutTime: '2026-03-01T18:00:00.000Z',
      reason: 'Forgot to punch in due to emergency meeting'
    };

    test('should accept valid regularization request', () => {
      const { error } = attendanceRegularizationSchema.validate(validRegularization);
      expect(error).toBeUndefined();
    });

    test('should require attendanceId', () => {
      const reg = { ...validRegularization };
      delete reg.attendanceId;
      const { error } = attendanceRegularizationSchema.validate(reg);
      expect(error).toBeDefined();
    });

    test('should require reason', () => {
      const reg = { ...validRegularization };
      delete reg.reason;
      const { error } = attendanceRegularizationSchema.validate(reg);
      expect(error).toBeDefined();
    });

    test('should reject short reason', () => {
      const { error } = attendanceRegularizationSchema.validate({
        ...validRegularization,
        reason: 'Short'
      });
      expect(error).toBeDefined();
      expect(error.message).toContain('at least 10 characters');
    });

    test('should accept supporting documents', () => {
      const { error } = attendanceRegularizationSchema.validate({
        ...validRegularization,
        supportingDocuments: [
          'https://example.com/doc1.pdf',
          'https://example.com/doc2.pdf'
        ]
      });
      expect(error).toBeUndefined();
    });

    test('should reject > 3 supporting documents', () => {
      const { error } = attendanceRegularizationSchema.validate({
        ...validRegularization,
        supportingDocuments: new Array(4).fill('https://example.com/doc.pdf')
      });
      expect(error).toBeDefined();
    });
  });

  describe('regularizationActionSchema', () => {
    test('should accept approve action', () => {
      const { error } = regularizationActionSchema.validate({
        action: 'approve',
        remarks: 'Approved based on emergency situation'
      });
      expect(error).toBeUndefined();
    });

    test('should accept reject action with reason', () => {
      const { error } = regularizationActionSchema.validate({
        action: 'reject',
        rejectionReason: 'Insufficient evidence provided for regularization'
      });
      expect(error).toBeUndefined();
    });

    test('should require rejectionReason when rejecting', () => {
      const { error } = regularizationActionSchema.validate({
        action: 'reject'
      });
      expect(error).toBeDefined();
    });
  });

  // ============================================================================
  // DEPARTMENT SCHEMAS
  // ============================================================================

  describe('createDepartmentSchema', () => {
    const validDepartment = {
      name: 'Engineering',
      code: 'ENG',
      description: 'Software Engineering Department',
      isActive: true
    };

    test('should accept valid department', () => {
      const { error } = createDepartmentSchema.validate(validDepartment);
      expect(error).toBeUndefined();
    });

    test('should require name', () => {
      const dept = { ...validDepartment };
      delete dept.name;
      const { error } = createDepartmentSchema.validate(dept);
      expect(error).toBeDefined();
    });

    test('should reject name < 2 characters', () => {
      const { error } = createDepartmentSchema.validate({
        ...validDepartment,
        name: 'A'
      });
      expect(error).toBeDefined();
    });

    test('should reject name > 100 characters', () => {
      const { error } = createDepartmentSchema.validate({
        ...validDepartment,
        name: 'a'.repeat(101)
      });
      expect(error).toBeDefined();
    });

    test('should accept uppercase code pattern', () => {
      const { error } = createDepartmentSchema.validate({
        ...validDepartment,
        code: 'ENG-DEV-01'
      });
      expect(error).toBeUndefined();
    });

    test('should reject code with lowercase', () => {
      const { error } = createDepartmentSchema.validate({
        ...validDepartment,
        code: 'eng'
      });
      expect(error).toBeDefined();
    });

    test('should accept headOfDepartment ObjectId', () => {
      const { error } = createDepartmentSchema.validate({
        ...validDepartment,
        headOfDepartment: '507f1f77bcf86cd799439011'
      });
      expect(error).toBeUndefined();
    });

    test('should set default isActive to true', () => {
      const dept = { ...validDepartment };
      delete dept.isActive;
      const { value } = createDepartmentSchema.validate(dept);
      expect(value.isActive).toBe(true);
    });
  });

  // ============================================================================
  // DESIGNATION SCHEMAS
  // ============================================================================

  describe('createDesignationSchema', () => {
    const validDesignation = {
      name: 'Senior Software Engineer',
      code: 'SSE',
      description: 'Senior level software development role',
      level: 3,
      isActive: true
    };

    test('should accept valid designation', () => {
      const { error } = createDesignationSchema.validate(validDesignation);
      expect(error).toBeUndefined();
    });

    test('should require name', () => {
      const desg = { ...validDesignation };
      delete desg.name;
      const { error } = createDesignationSchema.validate(desg);
      expect(error).toBeDefined();
    });

    test('should accept level 1-10', () => {
      for (let level = 1; level <= 10; level++) {
        const { error } = createDesignationSchema.validate({
          ...validDesignation,
          level
        });
        expect(error).toBeUndefined();
      }
    });

    test('should reject level < 1', () => {
      const { error } = createDesignationSchema.validate({
        ...validDesignation,
        level: 0
      });
      expect(error).toBeDefined();
    });

    test('should reject level > 10', () => {
      const { error } = createDesignationSchema.validate({
        ...validDesignation,
        level: 11
      });
      expect(error).toBeDefined();
    });
  });

  // ============================================================================
  // HOLIDAY SCHEMAS
  // ============================================================================

  describe('createHolidaySchema', () => {
    const validHoliday = {
      name: 'Independence Day',
      date: '2026-08-15',
      type: 'national',
      year: 2026,
      isOptional: false
    };

    test('should accept valid holiday', () => {
      const { error } = createHolidaySchema.validate(validHoliday);
      expect(error).toBeUndefined();
    });

    test('should accept all valid holiday types', () => {
      const types = ['public', 'national', 'regional', 'company', 'optional', 'restricted'];

      types.forEach(type => {
        const { error } = createHolidaySchema.validate({ ...validHoliday, type });
        expect(error).toBeUndefined();
      });
    });

    test('should require name', () => {
      const holiday = { ...validHoliday };
      delete holiday.name;
      const { error } = createHolidaySchema.validate(holiday);
      expect(error).toBeDefined();
    });

    test('should require date', () => {
      const holiday = { ...validHoliday };
      delete holiday.date;
      const { error } = createHolidaySchema.validate(holiday);
      expect(error).toBeDefined();
    });

    test('should require year', () => {
      const holiday = { ...validHoliday };
      delete holiday.year;
      const { error } = createHolidaySchema.validate(holiday);
      expect(error).toBeDefined();
    });

    test('should reject year < 2020', () => {
      const { error } = createHolidaySchema.validate({
        ...validHoliday,
        year: 2019
      });
      expect(error).toBeDefined();
    });

    test('should reject year > 2050', () => {
      const { error } = createHolidaySchema.validate({
        ...validHoliday,
        year: 2051
      });
      expect(error).toBeDefined();
    });

    test('should accept applicableToDepartments array', () => {
      const { error } = createHolidaySchema.validate({
        ...validHoliday,
        applicableToDepartments: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012']
      });
      expect(error).toBeUndefined();
    });
  });

  describe('calculateWorkingDaysSchema', () => {
    test('should accept valid date range', () => {
      const { error } = calculateWorkingDaysSchema.validate({
        startDate: '2026-01-01',
        endDate: '2026-01-31'
      });
      expect(error).toBeUndefined();
    });

    test('should require startDate', () => {
      const { error } = calculateWorkingDaysSchema.validate({
        endDate: '2026-01-31'
      });
      expect(error).toBeDefined();
    });

    test('should require endDate', () => {
      const { error } = calculateWorkingDaysSchema.validate({
        startDate: '2026-01-01'
      });
      expect(error).toBeDefined();
    });

    test('should reject end date before start date', () => {
      const { error } = calculateWorkingDaysSchema.validate({
        startDate: '2026-01-31',
        endDate: '2026-01-01'
      });
      expect(error).toBeDefined();
    });

    test('should accept includeWeekends flag', () => {
      const { error } = calculateWorkingDaysSchema.validate({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        includeWeekends: true
      });
      expect(error).toBeUndefined();
    });
  });

  // ============================================================================
  // POLICY SCHEMAS
  // ============================================================================

  describe('createPolicySchema', () => {
    const validPolicy = {
      title: 'Work From Home Policy',
      category: 'hr',
      content: 'This policy outlines the guidelines and procedures for employees who wish to work from home remotely.',
      version: '1.0',
      effectiveDate: '2026-01-01',
      requiresAcknowledgment: false,
      isActive: true
    };

    test('should accept valid policy', () => {
      const { error } = createPolicySchema.validate(validPolicy);
      expect(error).toBeUndefined();
    });

    test('should accept all valid policy categories', () => {
      const categories = ['leave', 'attendance', 'code_of_conduct', 'data_security', 'hr', 'it', 'safety', 'other'];

      categories.forEach(category => {
        const { error } = createPolicySchema.validate({ ...validPolicy, category });
        expect(error).toBeUndefined();
      });
    });

    test('should require title', () => {
      const policy = { ...validPolicy };
      delete policy.title;
      const { error } = createPolicySchema.validate(policy);
      expect(error).toBeDefined();
    });

    test('should reject title < 5 characters', () => {
      const { error } = createPolicySchema.validate({
        ...validPolicy,
        title: 'Test'
      });
      expect(error).toBeDefined();
    });

    test('should require category', () => {
      const policy = { ...validPolicy };
      delete policy.category;
      const { error } = createPolicySchema.validate(policy);
      expect(error).toBeDefined();
    });

    test('should require content', () => {
      const policy = { ...validPolicy };
      delete policy.content;
      const { error } = createPolicySchema.validate(policy);
      expect(error).toBeDefined();
    });

    test('should reject content < 50 characters', () => {
      const { error } = createPolicySchema.validate({
        ...validPolicy,
        content: 'Short content'
      });
      expect(error).toBeDefined();
    });

    test('should accept version format 1.0', () => {
      const { error } = createPolicySchema.validate({
        ...validPolicy,
        version: '1.0'
      });
      expect(error).toBeUndefined();
    });

    test('should accept version format v1.0.0', () => {
      const { error } = createPolicySchema.validate({
        ...validPolicy,
        version: 'v1.0.0'
      });
      expect(error).toBeUndefined();
    });

    test('should reject invalid version format', () => {
      const { error } = createPolicySchema.validate({
        ...validPolicy,
        version: 'version1'
      });
      expect(error).toBeDefined();
    });

    test('should require effectiveDate', () => {
      const policy = { ...validPolicy };
      delete policy.effectiveDate;
      const { error } = createPolicySchema.validate(policy);
      expect(error).toBeDefined();
    });

    test('should accept expiryDate after effectiveDate', () => {
      const { error } = createPolicySchema.validate({
        ...validPolicy,
        expiryDate: '2027-01-01'
      });
      expect(error).toBeUndefined();
    });

    test('should reject expiryDate before effectiveDate', () => {
      const { error } = createPolicySchema.validate({
        ...validPolicy,
        effectiveDate: '2026-12-31',
        expiryDate: '2026-01-01'
      });
      expect(error).toBeDefined();
    });

    test('should accept attachments array', () => {
      const { error } = createPolicySchema.validate({
        ...validPolicy,
        attachments: [
          'https://example.com/policy-v1.pdf',
          'https://example.com/guidelines.pdf'
        ]
      });
      expect(error).toBeUndefined();
    });

    test('should reject > 10 attachments', () => {
      const { error } = createPolicySchema.validate({
        ...validPolicy,
        attachments: new Array(11).fill('https://example.com/file.pdf')
      });
      expect(error).toBeDefined();
    });
  });
});
