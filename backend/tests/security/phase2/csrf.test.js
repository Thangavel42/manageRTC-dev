/**
 * Unit Tests for CSRF Protection
 * Tests Phase 2, Task 2.4
 */

import { describe, test, expect } from '@jest/globals';

describe('CSRF Protection - Unit Tests', () => {

  describe('CSRF Middleware Existence', () => {
    test('should export csrfProtection', async () => {
      const { csrfProtection } = await import('../../../middleware/csrf.js');
      expect(csrfProtection).toBeDefined();
      expect(typeof csrfProtection).toBe('function');
    });

    test('should export generateCsrfToken', async () => {
      const { generateCsrfToken } = await import('../../../middleware/csrf.js');
      expect(generateCsrfToken).toBeDefined();
      expect(typeof generateCsrfToken).toBe('function');
    });

    test('should export csrfErrorHandler', async () => {
      const { csrfErrorHandler } = await import('../../../middleware/csrf.js');
      expect(csrfErrorHandler).toBeDefined();
      expect(typeof csrfErrorHandler).toBe('function');
    });

    test('should export conditionalCsrf', async () => {
      const { conditionalCsrf } = await import('../../../middleware/csrf.js');
      expect(conditionalCsrf).toBeDefined();
      expect(typeof conditionalCsrf).toBe('function');
    });
  });

  describe('Conditional CSRF Middleware', () => {
    test('should skip CSRF for GET requests', async () => {
      const { conditionalCsrf } = await import('../../../middleware/csrf.js');

      const req = { method: 'GET', path: '/api/users' };
      const res = {};
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      conditionalCsrf(req, res, next);

      expect(nextCalled).toBe(true);
    });

    test('should skip CSRF for HEAD requests', async () => {
      const { conditionalCsrf } = await import('../../../middleware/csrf.js');

      const req = { method: 'HEAD', path: '/api/users' };
      const res = {};
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      conditionalCsrf(req, res, next);

      expect(nextCalled).toBe(true);
    });

    test('should skip CSRF for OPTIONS requests', async () => {
      const { conditionalCsrf } = await import('../../../middleware/csrf.js');

      const req = { method: 'OPTIONS', path: '/api/users' };
      const res = {};
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      conditionalCsrf(req, res, next);

      expect(nextCalled).toBe(true);
    });

    test('should skip CSRF for webhook paths', async () => {
      const { conditionalCsrf } = await import('../../../middleware/csrf.js');

      const req = { method: 'POST', path: '/webhooks/stripe' };
      const res = {};
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      conditionalCsrf(req, res, next);

      expect(nextCalled).toBe(true);
    });
  });

  describe('CSRF Error Handler', () => {
    test('should handle CSRF token errors', async () => {
      const { csrfErrorHandler } = await import('../../../middleware/csrf.js');

      const err = new Error('Invalid CSRF token');
      err.code = 'EBADCSRFTOKEN';

      const req = { user: { userId: 'user123' }, ip: '192.168.1.1', id: 'req-123' };
      const res = {
        status: function(code) {
          this.statusCode = code;
          return this;
        },
        json: function(data) {
          this.responseData = data;
          return this;
        }
      };

      let nextCalled = false;
      const next = () => { nextCalled = true; };

      csrfErrorHandler(err, req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res.responseData.success).toBe(false);
      expect(res.responseData.error.code).toBe('CSRF_TOKEN_INVALID');
      expect(res.responseData.error.message).toContain('CSRF token');
      expect(nextCalled).toBe(false);
    });

    test('should pass non-CSRF errors to next handler', async () => {
      const { csrfErrorHandler } = await import('../../../middleware/csrf.js');

      const err = new Error('Some other error');
      err.code = 'SOMETHING_ELSE';

      const req = {};
      const res = {};
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      csrfErrorHandler(err, req, res, next);

      expect(nextCalled).toBe(true);
    });
  });
});
