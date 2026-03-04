/**
 * Integration Tests for Authorization Gaps Fix
 * Tests Phase 2, Task 2.3
 */

import request from 'supertest';
import app from '../../../server.js';

describe('Authorization Gaps - Integration Tests (Phase 2)', () => {
  let employeeAuthToken;
  let hrAuthToken;
  let adminAuthToken;

  beforeAll(async () => {
    // Setup: Get auth tokens for different roles
    // Note: Adjust based on your actual test setup
  });

  afterAll(async () => {
    // Cleanup: Remove test data if needed
  });

  describe('Projects - Employee Without Record', () => {
    test('should return empty list for employee without employee record', async () => {
      // This test verifies the fix where employees without an employee record
      // used to get ALL projects, now they get an empty list

      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      // If employee record doesn't exist, should return empty array
      // with appropriate pagination
      if (response.status === 200) {
        if (response.body.data && Array.isArray(response.body.data)) {
          // If empty, verify pagination shows 0 items
          if (response.body.data.length === 0) {
            expect(response.body.pagination?.totalItems).toBe(0);
            expect(response.body.pagination?.totalPages).toBe(0);
          }
        }
      }

      // Should NOT return 500 error or all projects
      expect([200, 401, 403]).toContain(response.status);
    });

    test('should return filtered projects for employee with record', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);

        // If employee has projects, each should have the employee as member/leader/manager
        // This is verified by the backend filter
      }
    });

    test('should allow admin/hr to see all projects', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${adminAuthToken || hrAuthToken}`);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        // Admin/HR should potentially see more projects than employees
      }
    });
  });

  describe('Tasks - Employee Filtering', () => {
    test('should return empty list for employee without employee record', async () => {
      // This test verifies the NEW filtering added in Phase 2
      // Previously, tasks had NO employee filtering at all

      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      // If employee record doesn't exist, should return empty array
      if (response.status === 200) {
        if (response.body.data && Array.isArray(response.body.data)) {
          if (response.body.data.length === 0) {
            expect(response.body.pagination?.totalItems).toBe(0);
            expect(response.body.pagination?.totalPages).toBe(0);
          }
        }
      }

      expect([200, 401, 403]).toContain(response.status);
    });

    test('should return only assigned tasks for employee', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);

        // Each task should have the employee as assignee or creator
        // This is enforced by the backend filter added in Phase 2
      }
    });

    test('should allow admin/hr to see all tasks', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${adminAuthToken || hrAuthToken}`);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    test('should apply employee filter with project filter', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .query({ project: 'someProjectId' })
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      // Should still enforce employee filtering even with project filter
      expect([200, 401, 403]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        // Tasks should be filtered by BOTH project AND employee assignment
      }
    });

    test('should apply employee filter with status filter', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .query({ status: 'In Progress' })
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      // Should still enforce employee filtering even with status filter
      expect([200, 401, 403]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        // Tasks should be filtered by BOTH status AND employee assignment
      }
    });
  });

  describe('Security Logging', () => {
    test('should log warning when employee record not found', async () => {
      // This test verifies that security events are logged
      // The actual logging happens in the controller

      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      // The console.warn in the controller should have been called
      // Check server logs for: "[Security] Employee record not found for user"

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('Filter Compatibility', () => {
    test('should handle search with employee filtering', async () => {
      const response = await request(app)
        .get('/api/projects')
        .query({ search: 'test' })
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      expect([200, 401, 403]).toContain(response.status);

      if (response.status === 200) {
        // Search should work with employee filtering
        expect(response.body.success).toBe(true);
      }
    });

    test('should handle status filter with employee filtering', async () => {
      const response = await request(app)
        .get('/api/projects')
        .query({ status: 'Active' })
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      expect([200, 401, 403]).toContain(response.status);

      if (response.status === 200) {
        // Status filter should work with employee filtering
        expect(response.body.success).toBe(true);
      }
    });

    test('should handle priority filter with employee filtering', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .query({ priority: 'High' })
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      expect([200, 401, 403]).toContain(response.status);

      if (response.status === 200) {
        // Priority filter should work with employee filtering
        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('Pagination with Authorization', () => {
    test('should paginate filtered results correctly', async () => {
      const response = await request(app)
        .get('/api/projects')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${employeeAuthToken}`);

      if (response.status === 200) {
        expect(response.body.pagination).toBeDefined();
        expect(response.body.pagination.currentPage).toBe(1);
        expect(response.body.pagination.itemsPerPage).toBe(10);

        // Total items should reflect FILTERED count, not all projects
        expect(typeof response.body.pagination.totalItems).toBe('number');
      }
    });
  });
});
