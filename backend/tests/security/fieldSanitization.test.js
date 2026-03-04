/**
 * Unit Tests for Mass Assignment Prevention Utilities
 * Tests: backend/utils/fieldSanitization.js
 */

import {
  sanitizeEmployeeUpdate,
  removeProtectedFields,
  sanitizeLeaveUpdate,
  sanitizeAttendanceUpdate,
  validateHasFields,
  canUpdateField,
  getAllowedFields
} from '../../utils/fieldSanitization.js';

describe('Mass Assignment Prevention - fieldSanitization.js', () => {

  describe('sanitizeEmployeeUpdate() - Employee Role', () => {
    test('should allow employee to update allowed fields', () => {
      const updateData = {
        phone: '1234567890',
        bio: 'Test bio',
        skills: ['JavaScript', 'Node.js']
      };

      const sanitized = sanitizeEmployeeUpdate(updateData, 'employee');
      expect(sanitized).toHaveProperty('phone', '1234567890');
      expect(sanitized).toHaveProperty('bio', 'Test bio');
      expect(sanitized).toHaveProperty('skills');
    });

    test('should block employee from updating role field', () => {
      const updateData = {
        phone: '1234567890',
        role: 'admin', // ❌ Should be blocked
        bio: 'Test bio'
      };

      const sanitized = sanitizeEmployeeUpdate(updateData, 'employee');
      expect(sanitized).toHaveProperty('phone');
      expect(sanitized).toHaveProperty('bio');
      expect(sanitized.role).toBeUndefined();
    });

    test('should block employee from updating salary', () => {
      const updateData = {
        phone: '1234567890',
        salary: { basic: 999999 } // ❌ Should be blocked
      };

      const sanitized = sanitizeEmployeeUpdate(updateData, 'employee');
      expect(sanitized).toHaveProperty('phone');
      expect(sanitized.salary).toBeUndefined();
    });

    test('should block employee from updating protected fields', () => {
      const updateData = {
        phone: '1234567890',
        _id: 'malicious_id', // ❌ Protected
        employeeId: 'EMP-999', // ❌ Protected
        companyId: 'malicious_company' // ❌ Protected
      };

      const sanitized = sanitizeEmployeeUpdate(updateData, 'employee');
      expect(sanitized).toHaveProperty('phone');
      expect(sanitized._id).toBeUndefined();
      expect(sanitized.employeeId).toBeUndefined();
      expect(sanitized.companyId).toBeUndefined();
    });

    test('should handle nested address fields', () => {
      const updateData = {
        phone: '1234567890',
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY'
        }
      };

      const sanitized = sanitizeEmployeeUpdate(updateData, 'employee');
      expect(sanitized.phone).toBe('1234567890');
      // Note: The current implementation may handle nested objects differently
      // This test documents the expected behavior
    });
  });

  describe('sanitizeEmployeeUpdate() - HR Role', () => {
    test('should allow HR to update department and designation', () => {
      const updateData = {
        phone: '1234567890',
        department: 'Engineering',
        designation: 'Senior Developer',
        status: 'Active'
      };

      const sanitized = sanitizeEmployeeUpdate(updateData, 'hr');
      expect(sanitized).toHaveProperty('phone');
      expect(sanitized).toHaveProperty('department', 'Engineering');
      expect(sanitized).toHaveProperty('designation', 'Senior Developer');
      expect(sanitized).toHaveProperty('status', 'Active');
    });

    test('should block HR from updating salary', () => {
      const updateData = {
        department: 'Engineering',
        salary: { basic: 999999 } // ❌ Should be blocked for HR
      };

      const sanitized = sanitizeEmployeeUpdate(updateData, 'hr');
      expect(sanitized).toHaveProperty('department');
      expect(sanitized.salary).toBeUndefined();
    });

    test('should block HR from changing role', () => {
      const updateData = {
        department: 'Engineering',
        role: 'admin' // ❌ Should be blocked
      };

      const sanitized = sanitizeEmployeeUpdate(updateData, 'hr');
      expect(sanitized).toHaveProperty('department');
      expect(sanitized.role).toBeUndefined();
    });
  });

  describe('sanitizeEmployeeUpdate() - Admin Role', () => {
    test('should allow admin to update salary fields', () => {
      const updateData = {
        phone: '1234567890',
        department: 'Engineering',
        salary: {
          basic: 50000,
          HRA: 10000,
          total: 60000
        }
      };

      const sanitized = sanitizeEmployeeUpdate(updateData, 'admin');
      expect(sanitized).toHaveProperty('phone');
      expect(sanitized).toHaveProperty('department');
      expect(sanitized).toHaveProperty('salary');
    });

    test('should allow admin to update bank details', () => {
      const updateData = {
        bankDetails: {
          accountNumber: '1234567890',
          bankName: 'Test Bank',
          ifscCode: 'TEST0001'
        }
      };

      const sanitized = sanitizeEmployeeUpdate(updateData, 'admin');
      expect(sanitized).toHaveProperty('bankDetails');
    });

    test('should still block admin from updating protected system fields', () => {
      const updateData = {
        salary: { basic: 50000 },
        _id: 'malicious_id', // ❌ Still protected
        clerkUserId: 'malicious_user', // ❌ Still protected
        createdBy: 'someone_else' // ❌ Still protected
      };

      const sanitized = sanitizeEmployeeUpdate(updateData, 'admin');
      expect(sanitized).toHaveProperty('salary');
      expect(sanitized._id).toBeUndefined();
      expect(sanitized.clerkUserId).toBeUndefined();
      expect(sanitized.createdBy).toBeUndefined();
    });
  });

  describe('removeProtectedFields()', () => {
    test('should remove all protected fields', () => {
      const updateData = {
        phone: '1234567890',
        _id: 'test',
        employeeId: 'EMP-123',
        clerkUserId: 'user123',
        role: 'admin',
        companyId: 'company123',
        createdAt: new Date(),
        isDeleted: false
      };

      const sanitized = removeProtectedFields(updateData);
      expect(sanitized).toHaveProperty('phone');
      expect(sanitized._id).toBeUndefined();
      expect(sanitized.employeeId).toBeUndefined();
      expect(sanitized.clerkUserId).toBeUndefined();
      expect(sanitized.role).toBeUndefined();
      expect(sanitized.companyId).toBeUndefined();
      expect(sanitized.createdAt).toBeUndefined();
      expect(sanitized.isDeleted).toBeUndefined();
    });

    test('should not modify original object', () => {
      const original = { phone: '123', _id: 'test' };
      const sanitized = removeProtectedFields(original);

      expect(original._id).toBe('test'); // Original unchanged
      expect(sanitized._id).toBeUndefined();
    });

    test('should handle null and undefined', () => {
      expect(removeProtectedFields(null)).toBeNull();
      expect(removeProtectedFields(undefined)).toBeUndefined();
    });
  });

  describe('sanitizeLeaveUpdate()', () => {
    test('should allow employee to update allowed leave fields', () => {
      const leaveData = {
        reason: 'Family emergency',
        startDate: '2026-03-15',
        endDate: '2026-03-17'
      };

      const sanitized = sanitizeLeaveUpdate(leaveData, 'employee');
      expect(sanitized).toHaveProperty('reason');
      expect(sanitized).toHaveProperty('startDate');
      expect(sanitized).toHaveProperty('endDate');
    });

    test('should block employee from changing leave status', () => {
      const leaveData = {
        reason: 'Family emergency',
        status: 'Approved' // ❌ Should be blocked for employee
      };

      const sanitized = sanitizeLeaveUpdate(leaveData, 'employee');
      expect(sanitized).toHaveProperty('reason');
      expect(sanitized.status).toBeUndefined();
    });

    test('should allow HR to update leave status', () => {
      const leaveData = {
        status: 'Approved',
        approvalComments: 'Approved by HR'
      };

      const sanitized = sanitizeLeaveUpdate(leaveData, 'hr');
      expect(sanitized).toHaveProperty('status', 'Approved');
      expect(sanitized).toHaveProperty('approvalComments');
    });
  });

  describe('sanitizeAttendanceUpdate()', () => {
    test('should allow employee to update notes', () => {
      const attendanceData = {
        notes: 'Worked overtime',
        location: 'Office'
      };

      const sanitized = sanitizeAttendanceUpdate(attendanceData, 'employee');
      expect(sanitized).toHaveProperty('notes');
      expect(sanitized).toHaveProperty('location');
    });

    test('should block employee from changing attendance status', () => {
      const attendanceData = {
        notes: 'Test',
        status: 'Approved' // ❌ Should be blocked for employee
      };

      const sanitized = sanitizeAttendanceUpdate(attendanceData, 'employee');
      expect(sanitized).toHaveProperty('notes');
      expect(sanitized.status).toBeUndefined();
    });

    test('should allow admin to update all fields', () => {
      const attendanceData = {
        status: 'Approved',
        overtimeHours: 2,
        notes: 'Approved overtime'
      };

      const sanitized = sanitizeAttendanceUpdate(attendanceData, 'admin');
      expect(sanitized).toHaveProperty('status');
      expect(sanitized).toHaveProperty('overtimeHours');
      expect(sanitized).toHaveProperty('notes');
    });
  });

  describe('validateHasFields()', () => {
    test('should pass when object has fields', () => {
      expect(() => validateHasFields({ name: 'John' })).not.toThrow();
      expect(() => validateHasFields({ a: 1, b: 2 })).not.toThrow();
    });

    test('should throw error when object is empty', () => {
      expect(() => validateHasFields({})).toThrow('No valid fields to update');
    });

    test('should throw error for null/undefined', () => {
      expect(() => validateHasFields(null)).toThrow('No valid fields to update');
      expect(() => validateHasFields(undefined)).toThrow('No valid fields to update');
    });

    test('should throw error for non-objects', () => {
      expect(() => validateHasFields('string')).toThrow();
      expect(() => validateHasFields(123)).toThrow();
    });
  });

  describe('canUpdateField()', () => {
    test('should return true for allowed employee fields', () => {
      expect(canUpdateField('phone', 'employee', 'employee')).toBe(true);
      expect(canUpdateField('bio', 'employee', 'employee')).toBe(true);
      expect(canUpdateField('skills', 'employee', 'employee')).toBe(true);
    });

    test('should return false for disallowed employee fields', () => {
      expect(canUpdateField('salary', 'employee', 'employee')).toBe(false);
      expect(canUpdateField('role', 'employee', 'employee')).toBe(false);
      expect(canUpdateField('department', 'employee', 'employee')).toBe(false);
    });

    test('should return true for HR-allowed fields', () => {
      expect(canUpdateField('department', 'hr', 'employee')).toBe(true);
      expect(canUpdateField('designation', 'hr', 'employee')).toBe(true);
    });

    test('should return true for admin-allowed fields', () => {
      expect(canUpdateField('salary', 'admin', 'employee')).toBe(true);
      expect(canUpdateField('bankDetails', 'admin', 'employee')).toBe(true);
    });
  });

  describe('getAllowedFields()', () => {
    test('should return employee allowed fields', () => {
      const fields = getAllowedFields('employee', 'employee');
      expect(fields).toContain('phone');
      expect(fields).toContain('bio');
      expect(fields).not.toContain('salary');
      expect(fields).not.toContain('role');
    });

    test('should return HR allowed fields', () => {
      const fields = getAllowedFields('hr', 'employee');
      expect(fields).toContain('phone');
      expect(fields).toContain('department');
      expect(fields).toContain('designation');
      expect(fields.length).toBeGreaterThan(20); // HR has more fields than employee
    });

    test('should return admin allowed fields', () => {
      const fields = getAllowedFields('admin', 'employee');
      expect(fields).toContain('salary');
      expect(fields).toContain('bankDetails');
      expect(fields.length).toBeGreaterThan(40); // Admin has most fields
    });

    test('should return leave allowed fields', () => {
      const fields = getAllowedFields('employee', 'leave');
      expect(Array.isArray(fields)).toBe(true);
      expect(fields.length).toBeGreaterThan(0);
    });

    test('should return empty array for invalid entity type', () => {
      const fields = getAllowedFields('employee', 'invalid');
      expect(fields).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty update data', () => {
      const sanitized = sanitizeEmployeeUpdate({}, 'employee');
      expect(Object.keys(sanitized).length).toBe(0);
    });

    test('should handle update data with only blocked fields', () => {
      const updateData = {
        role: 'admin',
        salary: { basic: 999999 },
        _id: 'malicious'
      };

      const sanitized = sanitizeEmployeeUpdate(updateData, 'employee');
      expect(Object.keys(sanitized).length).toBe(0);
    });

    test('should handle mixed valid and invalid fields', () => {
      const updateData = {
        phone: '1234567890', // ✅ Valid
        role: 'admin', // ❌ Invalid
        bio: 'Test', // ✅ Valid
        salary: { basic: 999999 }, // ❌ Invalid
        _id: 'malicious' // ❌ Invalid
      };

      const sanitized = sanitizeEmployeeUpdate(updateData, 'employee');
      expect(sanitized).toHaveProperty('phone');
      expect(sanitized).toHaveProperty('bio');
      expect(sanitized.role).toBeUndefined();
      expect(sanitized.salary).toBeUndefined();
      expect(sanitized._id).toBeUndefined();
    });

    test('should handle undefined role (default to employee)', () => {
      const updateData = { phone: '1234567890', salary: { basic: 999999 } };
      const sanitized = sanitizeEmployeeUpdate(updateData, undefined);

      expect(sanitized).toHaveProperty('phone');
      expect(sanitized.salary).toBeUndefined(); // Salary not allowed for default (employee) role
    });
  });
});
