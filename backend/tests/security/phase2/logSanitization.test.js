/**
 * Unit Tests for Log Sanitization
 * Tests Phase 2, Task 2.5
 */

import {
  sanitizeForLogs,
  sanitizeError,
  sanitizeRequest,
  safeLog,
  createLogger,
  partialRedact
} from '../../../utils/logSanitization.js';

describe('Log Sanitization - Unit Tests', () => {

  describe('sanitizeForLogs()', () => {
    test('should redact password field', () => {
      const input = {
        email: 'test@example.com',
        password: 'MySecretPassword123'
      };

      const result = sanitizeForLogs(input);

      expect(result.email).toBe('test@example.com');
      expect(result.password).toBe('[REDACTED]');
    });

    test('should redact multiple sensitive fields', () => {
      const input = {
        name: 'John Doe',
        password: 'secret123',
        token: 'abc123token',
        apiKey: 'key123',
        normalField: 'visible'
      };

      const result = sanitizeForLogs(input);

      expect(result.name).toBe('John Doe');
      expect(result.normalField).toBe('visible');
      expect(result.password).toBe('[REDACTED]');
      expect(result.token).toBe('[REDACTED]');
      expect(result.apiKey).toBe('[REDACTED]');
    });

    test('should redact bankDetails object', () => {
      const input = {
        name: 'John Doe',
        bankDetails: {
          accountNumber: '1234567890',
          ifscCode: 'HDFC0001234',
          bankName: 'HDFC Bank'
        }
      };

      const result = sanitizeForLogs(input);

      expect(result.name).toBe('John Doe');
      expect(result.bankDetails).toBe('[REDACTED]');
    });

    test('should redact nested password fields', () => {
      const input = {
        user: {
          email: 'test@example.com',
          password: 'secret',
          profile: {
            name: 'John',
            currentPassword: 'oldSecret'
          }
        }
      };

      const result = sanitizeForLogs(input);

      expect(result.user.email).toBe('test@example.com');
      expect(result.user.password).toBe('[REDACTED]');
      expect(result.user.profile.name).toBe('John');
      expect(result.user.profile.currentPassword).toBe('[REDACTED]');
    });

    test('should handle arrays with sensitive data', () => {
      const input = [
        { name: 'User 1', password: 'secret1' },
        { name: 'User 2', password: 'secret2' }
      ];

      const result = sanitizeForLogs(input);

      expect(result[0].name).toBe('User 1');
      expect(result[0].password).toBe('[REDACTED]');
      expect(result[1].name).toBe('User 2');
      expect(result[1].password).toBe('[REDACTED]');
    });

    test('should redact additional custom fields', () => {
      const input = {
        name: 'John',
        customSecret: 'sensitive data',
        publicData: 'visible'
      };

      const result = sanitizeForLogs(input, ['customSecret']);

      expect(result.name).toBe('John');
      expect(result.publicData).toBe('visible');
      expect(result.customSecret).toBe('[REDACTED]');
    });

    test('should handle null and undefined', () => {
      expect(sanitizeForLogs(null)).toBeNull();
      expect(sanitizeForLogs(undefined)).toBeUndefined();
    });

    test('should handle primitives', () => {
      expect(sanitizeForLogs('string')).toBe('string');
      expect(sanitizeForLogs(123)).toBe(123);
      expect(sanitizeForLogs(true)).toBe(true);
    });

    test('should handle Date objects', () => {
      const date = new Date('2026-01-01');
      expect(sanitizeForLogs(date)).toBe(date);
    });

    test('should prevent infinite recursion', () => {
      const circular = { name: 'test' };
      circular.self = circular;

      // Should not throw, should handle depth limit
      const result = sanitizeForLogs(circular);
      expect(result.name).toBe('test');
    });

    test('should redact case-insensitive field names', () => {
      const input = {
        PASSWORD: 'secret',
        Token: 'abc123',
        ApiKey: 'key123'
      };

      const result = sanitizeForLogs(input);

      expect(result.PASSWORD).toBe('[REDACTED]');
      expect(result.Token).toBe('[REDACTED]');
      expect(result.ApiKey).toBe('[REDACTED]');
    });
  });

  describe('sanitizeError()', () => {
    test('should sanitize error object', () => {
      const error = new Error('Test error');
      error.code = 'TEST_ERROR';
      error.data = { password: 'secret', user: 'john' };

      const result = sanitizeError(error);

      expect(result.message).toBe('Test error');
      expect(result.code).toBe('TEST_ERROR');
      expect(result.data.user).toBe('john');
      expect(result.data.password).toBe('[REDACTED]');
    });

    test('should not include stack trace in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Test error');
      const result = sanitizeError(error);

      expect(result.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    test('should include stack trace in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');
      const result = sanitizeError(error);

      expect(result.stack).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });

    test('should handle null error', () => {
      expect(sanitizeError(null)).toBeNull();
    });

    test('should sanitize axios error response', () => {
      const error = new Error('API Error');
      error.response = {
        status: 401,
        statusText: 'Unauthorized',
        data: { password: 'secret', message: 'Invalid credentials' }
      };

      const result = sanitizeError(error);

      expect(result.response.status).toBe(401);
      expect(result.response.statusText).toBe('Unauthorized');
      expect(result.response.data.message).toBe('Invalid credentials');
      expect(result.response.data.password).toBe('[REDACTED]');
    });
  });

  describe('sanitizeRequest()', () => {
    test('should sanitize request object', () => {
      const req = {
        method: 'POST',
        url: '/api/users',
        path: '/api/users',
        query: { search: 'test' },
        params: { id: '123' },
        body: { email: 'test@example.com', password: 'secret' },
        headers: {
          'user-agent': 'Mozilla/5.0',
          'content-type': 'application/json',
          'authorization': 'Bearer token123',
          'cookie': 'session=abc123'
        },
        ip: '192.168.1.1',
        user: {
          userId: 'user123',
          role: 'employee',
          companyId: 'company123'
        },
        id: 'req-123'
      };

      const result = sanitizeRequest(req);

      expect(result.method).toBe('POST');
      expect(result.url).toBe('/api/users');
      expect(result.query.search).toBe('test');
      expect(result.params.id).toBe('123');
      expect(result.body.email).toBe('test@example.com');
      expect(result.body.password).toBe('[REDACTED]');
      expect(result.headers.authorization).toBe('[REDACTED]');
      expect(result.headers.cookie).toBe('[REDACTED]');
      expect(result.headers['user-agent']).toBe('Mozilla/5.0');
      expect(result.userId).toBe('user123');
      expect(result.role).toBe('employee');
    });

    test('should handle null request', () => {
      expect(sanitizeRequest(null)).toBeNull();
    });
  });

  describe('safeLog wrapper', () => {
    test('should have info method', () => {
      expect(safeLog.info).toBeDefined();
      expect(typeof safeLog.info).toBe('function');
    });

    test('should have warn method', () => {
      expect(safeLog.warn).toBeDefined();
      expect(typeof safeLog.warn).toBe('function');
    });

    test('should have error method', () => {
      expect(safeLog.error).toBeDefined();
      expect(typeof safeLog.error).toBe('function');
    });

    test('should have debug method', () => {
      expect(safeLog.debug).toBeDefined();
      expect(typeof safeLog.debug).toBe('function');
    });

    test('should have request method', () => {
      expect(safeLog.request).toBeDefined();
      expect(typeof safeLog.request).toBe('function');
    });
  });

  describe('createLogger()', () => {
    test('should create logger with module name', () => {
      const logger = createLogger('TestModule');

      expect(logger.info).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.debug).toBeDefined();
      expect(logger.request).toBeDefined();
    });
  });

  describe('partialRedact()', () => {
    test('should partially redact long string', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const result = partialRedact(token);

      expect(result).toMatch(/^eyJh\*+XVCJ9$/);
      expect(result.length).toBeGreaterThan(10);
    });

    test('should fully redact short string', () => {
      const short = 'abc';
      const result = partialRedact(short);

      expect(result).toBe('[REDACTED]');
    });

    test('should handle null/undefined', () => {
      expect(partialRedact(null)).toBe('[REDACTED]');
      expect(partialRedact(undefined)).toBe('[REDACTED]');
    });

    test('should handle non-string input', () => {
      expect(partialRedact(123)).toBe('[REDACTED]');
    });

    test('should respect custom show parameters', () => {
      const token = 'abcdefghijklmnop';
      const result = partialRedact(token, 2, 2);

      expect(result).toMatch(/^ab\*+op$/);
    });
  });
});
