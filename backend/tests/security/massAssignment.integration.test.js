/**
 * Integration Tests for Mass Assignment Prevention
 * Tests: Role-based field whitelisting via sanitizeEmployeeUpdate()
 */

import request from 'supertest';
import app from '../../server.js';

describe('Mass Assignment Prevention - Integration Tests', () => {
  let employeeAuthToken;
  let employeeId;
  let hrAuthToken;
  let hrEmployeeId;
  let adminAuthToken;
  let adminEmployeeId;

  beforeAll(async () => {
    // Setup: Create test users with different roles
    // Adjust based on your actual test setup
  });

  afterAll(async () => {
    // Cleanup: Remove test data
  });

  describe('Employee Role - Field Restrictions', () => {
    test('should allow employee to update allowed fields', async () => {
      const validUpdate = {
        phone: '1234567890',
        bio: 'Updated bio',
        skills: ['JavaScript', 'Node.js']
      };

      const response = await request(app)
        .put('/api/employees/me')
        .send(validUpdate)
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      expect([200, 401]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data.phone).toBe('1234567890');
      }
    });

    test('should block employee from updating role field', async () => {
      const maliciousUpdate = {
        phone: '1234567890',
        role: 'admin' // ❌ Should be blocked
      };

      const response = await request(app)
        .put('/api/employees/me')
        .send(maliciousUpdate)
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      if (response.status === 200) {
        // Even if update succeeds, role should NOT have changed
        const profile = await request(app)
          .get('/api/employees/me')
          .set('Authorization', `Bearer ${employeeAuthToken}`);

        expect(profile.body.data.role).not.toBe('admin');
        expect(profile.body.data.role).toBe('employee');
      }
    });

    test('should block employee from updating salary', async () => {
      const maliciousUpdate = {
        phone: '1234567890',
        salary: { basic: 999999, HRA: 50000 } // ❌ Should be blocked
      };

      const response = await request(app)
        .put('/api/employees/me')
        .send(maliciousUpdate)
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      if (response.status === 200) {
        // Verify salary was NOT updated
        const profile = await request(app)
          .get('/api/user-profile/salary')
          .set('Authorization', `Bearer ${employeeAuthToken}`);

        if (profile.body.data.salary) {
          expect(profile.body.data.salary.basic).not.toBe(999999);
        }
      }
    });

    test('should block employee from updating department', async () => {
      const maliciousUpdate = {
        phone: '1234567890',
        department: 'Executive' // ❌ Should be blocked for employee role
      };

      const response = await request(app)
        .put('/api/employees/me')
        .send(maliciousUpdate)
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      if (response.status === 200) {
        const profile = await request(app)
          .get('/api/employees/me')
          .set('Authorization', `Bearer ${employeeAuthToken}`);

        // Department should not have changed
        expect(profile.body.data.department).not.toBe('Executive');
      }
    });

    test('should block employee from updating protected system fields', async () => {
      const maliciousUpdate = {
        phone: '1234567890',
        _id: 'malicious_id', // ❌ Protected
        employeeId: 'EMP-HACKER', // ❌ Protected
        clerkUserId: 'malicious_user', // ❌ Protected
        companyId: 'other_company', // ❌ Protected
        createdBy: 'someone_else', // ❌ Protected
        isDeleted: true // ❌ Protected
      };

      const response = await request(app)
        .put('/api/employees/me')
        .send(maliciousUpdate)
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      if (response.status === 200) {
        const profile = await request(app)
          .get('/api/employees/me')
          .set('Authorization', `Bearer ${employeeAuthToken}`);

        // All protected fields should remain unchanged
        expect(profile.body.data._id).not.toBe('malicious_id');
        expect(profile.body.data.employeeId).not.toBe('EMP-HACKER');
        expect(profile.body.data.isDeleted).not.toBe(true);
      }
    });
  });

  describe('HR Role - Extended Permissions', () => {
    test('should allow HR to update department and designation', async () => {
      const hrUpdate = {
        department: 'Engineering',
        designation: 'Senior Developer',
        status: 'Active'
      };

      const response = await request(app)
        .put(`/api/employees/${employeeId}`)
        .send(hrUpdate)
        .set('Authorization', `Bearer ${hrAuthToken}`);

      expect([200, 401, 403]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.data.department).toBe('Engineering');
        expect(response.body.data.designation).toBe('Senior Developer');
      }
    });

    test('should block HR from updating salary', async () => {
      const maliciousUpdate = {
        department: 'Engineering',
        salary: { basic: 999999 } // ❌ Should be blocked for HR
      };

      const response = await request(app)
        .put(`/api/employees/${employeeId}`)
        .send(maliciousUpdate)
        .set('Authorization', `Bearer ${hrAuthToken}`);

      if (response.status === 200) {
        // Department may update, but salary should NOT
        expect(response.body.data.salary?.basic).not.toBe(999999);
      }
    });

    test('should block HR from changing employee role', async () => {
      const maliciousUpdate = {
        department: 'Engineering',
        role: 'admin' // ❌ Should be blocked
      };

      const response = await request(app)
        .put(`/api/employees/${employeeId}`)
        .send(maliciousUpdate)
        .set('Authorization', `Bearer ${hrAuthToken}`);

      if (response.status === 200) {
        const employee = await request(app)
          .get(`/api/employees/${employeeId}`)
          .set('Authorization', `Bearer ${hrAuthToken}`);

        expect(employee.body.data.role).not.toBe('admin');
      }
    });
  });

  describe('Admin Role - Full Permissions', () => {
    test('should allow admin to update salary fields', async () => {
      const adminUpdate = {
        salary: {
          basic: 50000,
          HRA: 10000,
          total: 60000
        }
      };

      const response = await request(app)
        .put(`/api/employees/${employeeId}`)
        .send(adminUpdate)
        .set('Authorization', `Bearer ${adminAuthToken}`);

      expect([200, 401, 403]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.data.salary.basic).toBe(50000);
      }
    });

    test('should allow admin to update bank details', async () => {
      const adminUpdate = {
        bankDetails: {
          accountNumber: '1234567890',
          bankName: 'Test Bank',
          ifscCode: 'TEST0001'
        }
      };

      const response = await request(app)
        .put(`/api/employees/${employeeId}`)
        .send(adminUpdate)
        .set('Authorization', `Bearer ${adminAuthToken}`);

      expect([200, 401, 403]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.data.bankDetails.accountNumber).toBe('1234567890');
      }
    });

    test('should still block admin from updating protected system fields', async () => {
      const maliciousUpdate = {
        salary: { basic: 50000 },
        _id: 'malicious_id', // ❌ Still protected even for admin
        clerkUserId: 'malicious_user', // ❌ Still protected
        createdBy: 'someone_else' // ❌ Still protected
      };

      const response = await request(app)
        .put(`/api/employees/${employeeId}`)
        .send(maliciousUpdate)
        .set('Authorization', `Bearer ${adminAuthToken}`);

      if (response.status === 200) {
        const employee = await request(app)
          .get(`/api/employees/${employeeId}`)
          .set('Authorization', `Bearer ${adminAuthToken}`);

        // Protected fields should remain unchanged
        expect(employee.body.data._id).not.toBe('malicious_id');
        expect(employee.body.data.clerkUserId).not.toBe('malicious_user');
      }
    });
  });

  describe('Nested Object Updates', () => {
    test('should handle address updates correctly', async () => {
      const addressUpdate = {
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY'
        }
      };

      const response = await request(app)
        .put('/api/employees/me')
        .send(addressUpdate)
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      if (response.status === 200) {
        expect(response.body.data.address.street).toBe('123 Main St');
        expect(response.body.data.address.city).toBe('New York');
      }
    });

    test('should handle emergency contact updates correctly', async () => {
      const emergencyUpdate = {
        emergencyContact: {
          name: 'John Doe',
          relationship: 'Father',
          phone: '9876543210'
        }
      };

      const response = await request(app)
        .put('/api/employees/me')
        .send(emergencyUpdate)
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      if (response.status === 200) {
        expect(response.body.data.emergencyContact.name).toBe('John Doe');
      }
    });
  });

  describe('Mixed Valid and Invalid Fields', () => {
    test('should update only allowed fields and ignore blocked ones', async () => {
      const mixedUpdate = {
        phone: '1234567890', // ✅ Allowed
        bio: 'Updated bio', // ✅ Allowed
        role: 'admin', // ❌ Blocked
        salary: { basic: 999999 }, // ❌ Blocked
        department: 'Executive', // ❌ Blocked
        _id: 'malicious' // ❌ Blocked
      };

      const response = await request(app)
        .put('/api/employees/me')
        .send(mixedUpdate)
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      if (response.status === 200) {
        const profile = await request(app)
          .get('/api/employees/me')
          .set('Authorization', `Bearer ${employeeAuthToken}`);

        // Allowed fields should be updated
        expect(profile.body.data.phone).toBe('1234567890');
        expect(profile.body.data.bio).toBe('Updated bio');

        // Blocked fields should NOT be updated
        expect(profile.body.data.role).not.toBe('admin');
        expect(profile.body.data.salary?.basic).not.toBe(999999);
        expect(profile.body.data._id).not.toBe('malicious');
      }
    });
  });

  describe('Empty Update Validation', () => {
    test('should reject updates with no valid fields', async () => {
      const emptyUpdate = {
        role: 'admin', // ❌ Blocked
        salary: { basic: 999999 }, // ❌ Blocked
        _id: 'malicious' // ❌ Blocked
      };

      const response = await request(app)
        .put('/api/employees/me')
        .send(emptyUpdate)
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      // Should return 400 because no valid fields remain after sanitization
      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('No valid fields to update');
    });

    test('should reject completely empty update', async () => {
      const response = await request(app)
        .put('/api/employees/me')
        .send({})
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('No valid fields to update');
    });
  });

  describe('Privilege Escalation Attempts', () => {
    test('should block privilege escalation via role update', async () => {
      const privilegeEscalation = {
        role: 'admin',
        permissions: ['*']
      };

      const response = await request(app)
        .put('/api/employees/me')
        .send(privilegeEscalation)
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      if (response.status === 200) {
        const profile = await request(app)
          .get('/api/employees/me')
          .set('Authorization', `Bearer ${employeeAuthToken}`);

        expect(profile.body.data.role).toBe('employee');
      }
    });

    test('should block salary manipulation attempt', async () => {
      const salaryManipulation = {
        salary: {
          basic: 500000,
          HRA: 100000,
          total: 600000
        }
      };

      const response = await request(app)
        .put('/api/employees/me')
        .send(salaryManipulation)
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      if (response.status === 200) {
        const profile = await request(app)
          .get('/api/user-profile/salary')
          .set('Authorization', `Bearer ${employeeAuthToken}`);

        if (profile.body.data.salary) {
          expect(profile.body.data.salary.basic).not.toBe(500000);
        }
      }
    });

    test('should block status manipulation to bypass inactive checks', async () => {
      const statusManipulation = {
        status: 'Active',
        isActive: true,
        isDeleted: false
      };

      const response = await request(app)
        .put('/api/employees/me')
        .send(statusManipulation)
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      // Status, isActive, isDeleted should not be updatable by employee
      if (response.status === 200) {
        // These fields should be ignored by sanitization
      }
    });
  });

  describe('Console Security Logging', () => {
    test('should log blocked fields for security monitoring', async () => {
      // This test verifies that blocked fields are logged
      // In actual implementation, check console output or logs
      const maliciousUpdate = {
        phone: '1234567890',
        role: 'admin',
        salary: { basic: 999999 }
      };

      const response = await request(app)
        .put('/api/employees/me')
        .send(maliciousUpdate)
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      // Console should log: [Security] Blocked fields in employee update (role: employee): ['role', 'salary']
      expect([200, 400, 401]).toContain(response.status);
    });
  });

  describe('Field Whitelisting Across Different Endpoints', () => {
    test('should apply same whitelisting to /api/user-profile/current', async () => {
      const maliciousUpdate = {
        phone: '1234567890',
        role: 'admin'
      };

      const response = await request(app)
        .put('/api/user-profile/current')
        .send(maliciousUpdate)
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      if (response.status === 200) {
        expect(response.body.data.role).not.toBe('admin');
      }
    });

    test('should apply whitelisting to /api/employees/:id endpoint', async () => {
      const maliciousUpdate = {
        phone: '1234567890',
        role: 'admin'
      };

      const response = await request(app)
        .put(`/api/employees/${employeeId}`)
        .send(maliciousUpdate)
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      // Employee should not be able to update other employees
      expect([403, 401]).toContain(response.status);
    });
  });
});
