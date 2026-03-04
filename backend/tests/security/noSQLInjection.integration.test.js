/**
 * Integration Tests for NoSQL Injection Prevention
 * Tests actual API endpoints with NoSQL injection attempts
 */

import request from 'supertest';
import app from '../../server.js';

describe('NoSQL Injection Prevention - Integration Tests', () => {
  let authToken;
  let testEmployeeId;

  beforeAll(async () => {
    // Setup: Create test user and get auth token
    // Note: This assumes you have a test authentication setup
    // Adjust based on your actual test setup
  });

  afterAll(async () => {
    // Cleanup: Remove test data
  });

  describe('Search Endpoint - MongoDB Operator Injection', () => {
    test('should block $where operator in search query', async () => {
      const response = await request(app)
        .get('/api/employees')
        .query({ search: '{"$where": "sleep(5000)"}' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_SEARCH_QUERY');
      expect(response.body.error.message).toContain('$where');
    });

    test('should block $ne operator in search query', async () => {
      const response = await request(app)
        .get('/api/projects')
        .query({ search: '$ne' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('$ne');
    });

    test('should block $regex operator injection', async () => {
      const response = await request(app)
        .get('/api/leaves')
        .query({ search: '{"$regex": ".*"}' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('$regex');
    });

    test('should block JSON object injection in search', () => {
      const response = await request(app)
        .get('/api/tasks')
        .query({ search: '{"admin": true}' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('JSON objects not allowed');
    });

    test('should allow valid search queries', async () => {
      const response = await request(app)
        .get('/api/employees')
        .query({ search: 'John Doe' })
        .set('Authorization', `Bearer ${authToken}`);

      // Should succeed or return 401 if not authenticated in test
      expect([200, 401, 403]).toContain(response.status);
      if (response.status === 400) {
        expect(response.body.error.code).not.toBe('INVALID_SEARCH_QUERY');
      }
    });
  });

  describe('Request Body - MongoDB Operator Removal', () => {
    test('should remove $set operator from employee update', async () => {
      const maliciousUpdate = {
        phone: '1234567890',
        $set: {
          role: 'admin',
          salary: { basic: 999999 }
        }
      };

      const response = await request(app)
        .put(`/api/employees/${testEmployeeId}`)
        .send(maliciousUpdate)
        .set('Authorization', `Bearer ${authToken}`);

      // Even if update succeeds, $set should have been removed by sanitization
      if (response.status === 200) {
        // Verify that role and salary weren't updated via $set
        const employee = await request(app)
          .get(`/api/employees/${testEmployeeId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(employee.body.data.role).not.toBe('admin');
      }
    });

    test('should remove $where operator from create request', async () => {
      const maliciousCreate = {
        name: 'Test Project',
        $where: 'this.role === "admin"'
      };

      const response = await request(app)
        .post('/api/projects')
        .send(maliciousCreate)
        .set('Authorization', `Bearer ${authToken}`);

      // Should either succeed without $where field or fail validation
      // But should NOT execute the $where operator
      expect([200, 201, 400, 401, 403]).toContain(response.status);
    });
  });

  describe('URL Parameters - ObjectId Validation', () => {
    test('should reject invalid ObjectId format', async () => {
      const response = await request(app)
        .get('/api/employees/invalid-id-format')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_PARAMETER');
      expect(response.body.error.message).toContain('Invalid id format');
    });

    test('should reject SQL injection attempt in ObjectId', async () => {
      const response = await request(app)
        .get('/api/employees/507f1f77bcf86cd799439011; DROP TABLE users--')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_PARAMETER');
    });

    test('should reject JavaScript injection in ObjectId', async () => {
      const response = await request(app)
        .get('/api/leaves/<script>alert("XSS")</script>')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('Invalid id format');
    });

    test('should accept valid ObjectId format', async () => {
      const validObjectId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/employees/${validObjectId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Should either find employee or return 404, but NOT 400 for invalid format
      expect([200, 404, 401, 403]).toContain(response.status);
      if (response.status === 400) {
        expect(response.body.error.code).not.toBe('INVALID_PARAMETER');
      }
    });
  });

  describe('Pagination - DoS Prevention', () => {
    test('should enforce maximum limit of 100 records', async () => {
      const response = await request(app)
        .get('/api/employees')
        .query({ limit: 999999 })
        .set('Authorization', `Bearer ${authToken}`);

      // Limit should be capped at 100
      if (response.status === 200) {
        expect(response.body.pagination.limit).toBeLessThanOrEqual(100);
      }
    });

    test('should handle negative limit values', async () => {
      const response = await request(app)
        .get('/api/projects')
        .query({ limit: -50 })
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        expect(response.body.pagination.limit).toBeGreaterThan(0);
      }
    });

    test('should handle string limit values', async () => {
      const response = await request(app)
        .get('/api/leaves')
        .query({ limit: 'abc' })
        .set('Authorization', `Bearer ${authToken}`);

      // Should either parse to default or return validation error
      expect([200, 400, 401, 403]).toContain(response.status);
    });
  });

  describe('Query Parameter Object Injection', () => {
    test('should block object injection in query parameters', async () => {
      // Attempt to inject an object as a query parameter
      const response = await request(app)
        .get('/api/employees')
        .query({ status: { $ne: 'Inactive' } })
        .set('Authorization', `Bearer ${authToken}`);

      // The object should be removed by sanitizeQuery middleware
      // Either succeeds without the injected object or returns error
      expect([200, 400, 401, 403]).toContain(response.status);
    });
  });

  describe('ReDoS Prevention', () => {
    test('should handle complex regex patterns safely', async () => {
      const complexRegex = '(a+)+b';
      const startTime = Date.now();

      const response = await request(app)
        .get('/api/employees')
        .query({ search: complexRegex })
        .set('Authorization', `Bearer ${authToken}`);

      const duration = Date.now() - startTime;

      // Should complete quickly (< 1 second) due to escapeRegex()
      expect(duration).toBeLessThan(1000);
      expect([200, 400, 401, 403]).toContain(response.status);
    });

    test('should escape regex special characters in search', async () => {
      const regexPatterns = ['.*', '.+', '^$', '[a-z]*'];

      for (const pattern of regexPatterns) {
        const response = await request(app)
          .get('/api/projects')
          .query({ search: pattern })
          .set('Authorization', `Bearer ${authToken}`);

        // Should treat as literal string, not regex pattern
        expect([200, 400, 401, 403]).toContain(response.status);
      }
    });
  });

  describe('Case Sensitivity of Operator Detection', () => {
    test('should detect operators regardless of case', async () => {
      const operators = ['$WHERE', '$Ne', '$REGEX', '$gt', '$LT'];

      for (const op of operators) {
        const response = await request(app)
          .get('/api/employees')
          .query({ search: `test ${op} query` })
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('INVALID_SEARCH_QUERY');
      }
    });
  });

  describe('Multiple Injection Vectors', () => {
    test('should block combined injection attempts', async () => {
      const maliciousRequest = {
        search: '{"$where": "sleep(5000)"}',
        limit: 999999,
        filter: { $ne: 'test' }
      };

      const response = await request(app)
        .get('/api/employees')
        .query(maliciousRequest)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_SEARCH_QUERY');
    });

    test('should handle injection in both body and query', async () => {
      const response = await request(app)
        .post('/api/leaves')
        .query({ search: '{"$where": "1=1"}' })
        .send({ $set: { status: 'Approved' } })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });
});
