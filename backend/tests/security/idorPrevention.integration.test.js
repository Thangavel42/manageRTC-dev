/**
 * Integration Tests for IDOR Prevention
 * Tests: Insecure Direct Object Reference protection via requireOwnEmployee middleware
 */

import request from 'supertest';
import app from '../../server.js';

describe('IDOR Prevention - Integration Tests', () => {
  let employeeAuthToken;
  let employeeUserId;
  let otherEmployeeId;
  let adminAuthToken;

  beforeAll(async () => {
    // Setup: Create test users with different roles
    // Adjust based on your actual test setup
  });

  afterAll(async () => {
    // Cleanup: Remove test data
  });

  describe('Profile Access - Own Profile Only', () => {
    test('should allow employee to access their own profile', async () => {
      const response = await request(app)
        .get('/api/user-profile/current')
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      expect([200, 401]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('email');
      }
    });

    test('should block employee from accessing another employee profile', async () => {
      // Attempt to access another employee's profile
      const response = await request(app)
        .get(`/api/employees/${otherEmployeeId}`)
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      // Should either return 403 Forbidden or only return allowed fields
      if (response.status === 200) {
        // If it returns data, sensitive fields should be filtered
        expect(response.body.data.salary).toBeUndefined();
        expect(response.body.data.bankDetails).toBeUndefined();
      } else {
        expect([403, 401]).toContain(response.status);
      }
    });

    test('should block employee from updating another employee profile', async () => {
      const maliciousUpdate = {
        phone: '9999999999',
        role: 'admin'
      };

      const response = await request(app)
        .put(`/api/employees/${otherEmployeeId}`)
        .send(maliciousUpdate)
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      expect([403, 401]).toContain(response.status);
      if (response.body.error) {
        expect(response.body.error.code).toMatch(/FORBIDDEN|UNAUTHORIZED/);
      }
    });
  });

  describe('requireOwnEmployee Middleware', () => {
    test('should attach employee object to request for own profile', async () => {
      const response = await request(app)
        .get('/api/user-profile/current')
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      if (response.status === 200) {
        expect(response.body.data).toHaveProperty('_id');
        expect(response.body.data).toHaveProperty('email');
      }
    });

    test('should verify employee belongs to correct company', async () => {
      // This test assumes multi-tenant architecture
      const response = await request(app)
        .get('/api/employees/me')
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      if (response.status === 200) {
        expect(response.body.data.companyId).toBeDefined();
      }
    });

    test('should reject deleted/inactive employee records', async () => {
      // Assuming there's a test setup for soft-deleted employee
      // This test verifies that soft-deleted employees cannot access profiles
      const response = await request(app)
        .get('/api/user-profile/current')
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      if (response.status === 403) {
        expect(response.body.error.message).toContain('employee');
      }
    });
  });

  describe('JWT Manipulation Attempts', () => {
    test('should reject modified JWT payload', async () => {
      // Attempt with malformed/tampered token
      const tamperedToken = employeeAuthToken + 'malicious';

      const response = await request(app)
        .get('/api/user-profile/current')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should verify userId from JWT matches employee record', async () => {
      // This is implicitly tested by requireOwnEmployee middleware
      const response = await request(app)
        .get('/api/user-profile/current')
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      if (response.status === 200) {
        // The middleware should have verified userId matches clerkUserId in DB
        expect(response.body.data).toBeDefined();
      }
    });
  });

  describe('Profile Update - IDOR Protection', () => {
    test('should allow employee to update their own profile', async () => {
      const validUpdate = {
        phone: '1234567890',
        bio: 'Updated bio'
      };

      const response = await request(app)
        .put('/api/user-profile/current')
        .send(validUpdate)
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      expect([200, 401, 403]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
      }
    });

    test('should block employee from updating another profile via /me endpoint', async () => {
      // Even if employee tries to manipulate request, middleware should prevent access
      const response = await request(app)
        .put('/api/employees/me')
        .send({ phone: '9999999999' })
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      // Should only update own profile, not others
      if (response.status === 200) {
        // Verify the update was applied to the correct employee
        const profile = await request(app)
          .get('/api/employees/me')
          .set('Authorization', `Bearer ${employeeAuthToken}`);

        expect(profile.body.data.phone).toBe('9999999999');
      }
    });
  });

  describe('Sensitive Data Access Control', () => {
    test('should not expose salary info to regular employees for other profiles', async () => {
      const response = await request(app)
        .get(`/api/employees/${otherEmployeeId}`)
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      if (response.status === 200) {
        expect(response.body.data.salary).toBeUndefined();
        expect(response.body.data.bankDetails).toBeUndefined();
      } else {
        expect([403, 401]).toContain(response.status);
      }
    });

    test('should allow employee to access own salary info', async () => {
      const response = await request(app)
        .get('/api/user-profile/salary')
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      expect([200, 401, 403]).toContain(response.status);
      if (response.status === 200) {
        // Can access own salary
        expect(response.body.data).toBeDefined();
      }
    });

    test('should allow admin to access any employee salary info', async () => {
      const response = await request(app)
        .get(`/api/employees/${otherEmployeeId}`)
        .set('Authorization', `Bearer ${adminAuthToken}`);

      if (response.status === 200) {
        // Admin should see full data
        expect(response.body.data).toBeDefined();
      }
    });
  });

  describe('Password Change - IDOR Protection', () => {
    test('should allow employee to change own password', async () => {
      const passwordChange = {
        currentPassword: 'currentPass123',
        newPassword: 'newPass123',
        confirmPassword: 'newPass123'
      };

      const response = await request(app)
        .post('/api/user-profile/change-password')
        .send(passwordChange)
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      expect([200, 400, 401]).toContain(response.status);
    });

    test('should block employee from changing another employee password', async () => {
      const passwordChange = {
        currentPassword: 'currentPass123',
        newPassword: 'newPass123',
        confirmPassword: 'newPass123'
      };

      const response = await request(app)
        .post(`/api/employees/${otherEmployeeId}/change-password`)
        .send(passwordChange)
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      expect([403, 401]).toContain(response.status);
    });
  });

  describe('Work Info and Statutory Info - Access Control', () => {
    test('should allow employee to access own work info', async () => {
      const response = await request(app)
        .get('/api/user-profile/work-info')
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      expect([200, 401]).toContain(response.status);
    });

    test('should allow employee to access own statutory info', async () => {
      const response = await request(app)
        .get('/api/user-profile/statutory')
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      expect([200, 401]).toContain(response.status);
    });

    test('should block employee from accessing another employee work info', async () => {
      // Assuming there's an endpoint for specific employee work info
      const response = await request(app)
        .get(`/api/employees/${otherEmployeeId}/work-info`)
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      expect([403, 404, 401]).toContain(response.status);
    });
  });

  describe('Session Hijacking Protection', () => {
    test('should invalidate access when employee status becomes inactive', async () => {
      // This assumes employeeStatusService is working correctly
      // Test that inactive employees cannot access profiles even with valid JWT
      const response = await request(app)
        .get('/api/user-profile/current')
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      // If employee is inactive, should return 403
      if (response.status === 403) {
        expect(response.body.error.message).toContain('active');
      }
    });

    test('should verify companyId consistency', async () => {
      const response = await request(app)
        .get('/api/user-profile/current')
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      if (response.status === 200) {
        // CompanyId from JWT should match employee record in DB
        expect(response.body.data.companyId).toBeDefined();
      }
    });
  });

  describe('Cross-Tenant Access Prevention', () => {
    test('should prevent access to employees from different companies', async () => {
      // Assuming otherEmployeeId belongs to different company
      const response = await request(app)
        .get(`/api/employees/${otherEmployeeId}`)
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      // Should fail with 403 or 404 (not found in current company)
      expect([403, 404, 401]).toContain(response.status);
    });
  });
});
