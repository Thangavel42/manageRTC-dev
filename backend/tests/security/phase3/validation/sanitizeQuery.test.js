/**
 * Unit Tests for Query Sanitization Middleware
 * Tests Phase 3, Task 3.4
 *
 * @jest-environment node
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import {
  sanitizeQuery,
  validateQueryStrict,
  blockMongoOperators,
  validateObjectIdParams,
  sanitizeObject,
  convertBooleans,
  removeEmpty
} from '../../../../middleware/validation/sanitizeQuery.js';

describe('Query Sanitization Middleware - Unit Tests', () => {

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  describe('sanitizeObject', () => {
    test('should remove MongoDB operators from object', () => {
      const input = {
        name: 'John',
        $where: 'malicious code',
        nested: {
          $ne: 'value',
          safe: 'data'
        }
      };

      const result = sanitizeObject(input);

      expect(result.$where).toBeUndefined();
      expect(result.nested.$ne).toBeUndefined();
      expect(result.name).toBe('John');
      expect(result.nested.safe).toBe('data');
    });

    test('should remove string values containing operators', () => {
      const input = {
        search: 'normal search',
        malicious: '$where: function() { return true; }'
      };

      const result = sanitizeObject(input);

      expect(result.search).toBe('normal search');
      expect(result.malicious).toBe(''); // Replaced with empty string
    });

    test('should handle arrays correctly', () => {
      const input = {
        items: ['safe', '$where', 'another'],
        nested: {
          $gt: 5,
          array: [1, 2, 3]
        }
      };

      const result = sanitizeObject(input);

      expect(result.items).toEqual(['safe', '', 'another']);
      expect(result.nested.$gt).toBeUndefined();
      expect(result.nested.array).toEqual([1, 2, 3]);
    });

    test('should handle null and undefined', () => {
      expect(sanitizeObject(null)).toBeNull();
      expect(sanitizeObject(undefined)).toBeUndefined();
      expect(sanitizeObject('string')).toBe('string');
      expect(sanitizeObject(123)).toBe(123);
    });
  });

  describe('convertBooleans', () => {
    test('should convert string "true" to boolean true', () => {
      const input = { isActive: 'true', enabled: '1' };
      const result = convertBooleans(input);

      expect(result.isActive).toBe(true);
      expect(result.enabled).toBe(true);
    });

    test('should convert string "false" to boolean false', () => {
      const input = { isActive: 'false', enabled: '0' };
      const result = convertBooleans(input);

      expect(result.isActive).toBe(false);
      expect(result.enabled).toBe(false);
    });

    test('should leave actual booleans unchanged', () => {
      const input = { isActive: true, enabled: false };
      const result = convertBooleans(input);

      expect(result.isActive).toBe(true);
      expect(result.enabled).toBe(false);
    });

    test('should leave other values unchanged', () => {
      const input = { name: 'test', count: 5, flag: 'maybe' };
      const result = convertBooleans(input);

      expect(result.name).toBe('test');
      expect(result.count).toBe(5);
      expect(result.flag).toBe('maybe');
    });
  });

  describe('removeEmpty', () => {
    test('should remove null values', () => {
      const input = { name: 'test', nullValue: null, count: 5 };
      const result = removeEmpty(input);

      expect(result.nullValue).toBeUndefined();
      expect(result.name).toBe('test');
      expect(result.count).toBe(5);
    });

    test('should remove undefined values', () => {
      const input = { name: 'test', undefinedValue: undefined, count: 5 };
      const result = removeEmpty(input);

      expect(result.undefinedValue).toBeUndefined();
      expect(result.name).toBe('test');
      expect(result.count).toBe(5);
    });

    test('should remove empty strings', () => {
      const input = { name: 'test', empty: '', count: 5 };
      const result = removeEmpty(input);

      expect(result.empty).toBeUndefined();
      expect(result.name).toBe('test');
      expect(result.count).toBe(5);
    });

    test('should keep falsy values that are not null/undefined/empty', () => {
      const input = { zero: 0, falseValue: false, name: 'test' };
      const result = removeEmpty(input);

      expect(result.zero).toBe(0);
      expect(result.falseValue).toBe(false);
      expect(result.name).toBe('test');
    });
  });

  // ============================================================================
  // MIDDLEWARE FUNCTIONS
  // ============================================================================

  describe('sanitizeQuery middleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = { query: {} };
      res = {};
      next = jest.fn();
    });

    test('should sanitize valid query parameters', async () => {
      req.query = {
        page: '1',
        limit: '10',
        search: 'test',
        isActive: 'true'
      };

      const middleware = sanitizeQuery();
      await middleware(req, res, next);

      expect(req.query.page).toBe(1);
      expect(req.query.limit).toBe(10);
      expect(req.query.search).toBe('test');
      expect(req.query.isActive).toBe(true);
      expect(req.querySanitized).toBe(true);
      expect(next).toHaveBeenCalledWith();
    });

    test('should remove MongoDB operators', async () => {
      req.query = {
        name: 'test',
        $where: 'malicious',
        $ne: 'value'
      };

      const middleware = sanitizeQuery();
      await middleware(req, res, next);

      expect(req.query.$where).toBeUndefined();
      expect(req.query.$ne).toBeUndefined();
      expect(req.query.name).toBe('test');
      expect(next).toHaveBeenCalledWith();
    });

    test('should apply default values', async () => {
      req.query = {};

      const middleware = sanitizeQuery();
      await middleware(req, res, next);

      expect(req.query.page).toBe(1);
      expect(req.query.limit).toBe(10);
      expect(next).toHaveBeenCalledWith();
    });

    test('should validate pagination limits', async () => {
      req.query = { page: '0', limit: '101' };

      const middleware = sanitizeQuery({ strict: false });
      await middleware(req, res, next);

      // In non-strict mode, just logs warning and continues
      expect(next).toHaveBeenCalledWith();
    });

    test('should throw error in strict mode on validation failure', async () => {
      req.query = { page: '0' };

      const middleware = sanitizeQuery({ strict: true });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Query validation failed')
      }));
    });

    test('should validate date ranges', async () => {
      req.query = {
        startDate: '2026-03-01',
        endDate: '2026-03-31'
      };

      const middleware = sanitizeQuery();
      await middleware(req, res, next);

      expect(req.query.startDate).toBeInstanceOf(Date);
      expect(req.query.endDate).toBeInstanceOf(Date);
      expect(next).toHaveBeenCalledWith();
    });

    test('should reject invalid date range', async () => {
      req.query = {
        startDate: '2026-03-31',
        endDate: '2026-03-01' // Before start
      };

      const middleware = sanitizeQuery({ strict: true });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Query validation failed')
      }));
    });

    test('should validate ObjectId format', async () => {
      req.query = {
        departmentId: '507f1f77bcf86cd799439011' // Valid ObjectId
      };

      const middleware = sanitizeQuery();
      await middleware(req, res, next);

      expect(req.query.departmentId).toBe('507f1f77bcf86cd799439011');
      expect(next).toHaveBeenCalledWith();
    });

    test('should reject invalid ObjectId format', async () => {
      req.query = {
        departmentId: 'invalid-id'
      };

      const middleware = sanitizeQuery({ strict: true });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Query validation failed')
      }));
    });

    test('should validate search pattern', async () => {
      req.query = {
        search: 'Valid search 123'
      };

      const middleware = sanitizeQuery();
      await middleware(req, res, next);

      expect(req.query.search).toBe('Valid search 123');
      expect(next).toHaveBeenCalledWith();
    });

    test('should reject search with special characters', async () => {
      req.query = {
        search: 'Invalid<script>alert(1)</script>'
      };

      const middleware = sanitizeQuery({ strict: true });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Query validation failed')
      }));
    });

    test('should validate year range', async () => {
      req.query = { year: '2026' };

      const middleware = sanitizeQuery();
      await middleware(req, res, next);

      expect(req.query.year).toBe(2026);
      expect(next).toHaveBeenCalledWith();
    });

    test('should reject year outside range', async () => {
      req.query = { year: '2051' };

      const middleware = sanitizeQuery({ strict: true });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Query validation failed')
      }));
    });

    test('should validate month range', async () => {
      req.query = { month: '6' };

      const middleware = sanitizeQuery();
      await middleware(req, res, next);

      expect(req.query.month).toBe(6);
      expect(next).toHaveBeenCalledWith();
    });

    test('should reject month outside range', async () => {
      req.query = { month: '13' };

      const middleware = sanitizeQuery({ strict: true });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Query validation failed')
      }));
    });
  });

  describe('blockMongoOperators middleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = { query: {} };
      res = {};
      next = jest.fn();
    });

    test('should allow safe queries', () => {
      req.query = { name: 'test', status: 'active' };

      blockMongoOperators(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('should block $where operator', () => {
      req.query = { $where: 'malicious' };

      blockMongoOperators(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('$where')
      }));
    });

    test('should block $ne operator', () => {
      req.query = { name: { $ne: 'admin' } };

      blockMongoOperators(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('$ne')
      }));
    });

    test('should block nested operators', () => {
      req.query = { filter: JSON.stringify({ $gt: 5 }) };

      blockMongoOperators(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('$gt')
      }));
    });
  });

  describe('validateObjectIdParams middleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = { params: {} };
      res = {};
      next = jest.fn();
    });

    test('should accept valid ObjectId', () => {
      req.params = { id: '507f1f77bcf86cd799439011' };

      const middleware = validateObjectIdParams('id');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('should reject invalid ObjectId', () => {
      req.params = { id: 'invalid-id' };

      const middleware = validateObjectIdParams('id');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Invalid ObjectId')
      }));
    });

    test('should validate multiple params', () => {
      req.params = {
        id: '507f1f77bcf86cd799439011',
        employeeId: '507f1f77bcf86cd799439012'
      };

      const middleware = validateObjectIdParams('id', 'employeeId');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('should reject if any param is invalid', () => {
      req.params = {
        id: '507f1f77bcf86cd799439011',
        employeeId: 'invalid'
      };

      const middleware = validateObjectIdParams('id', 'employeeId');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Invalid ObjectId')
      }));
    });

    test('should require specified params', () => {
      req.params = {};

      const middleware = validateObjectIdParams('id');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('required')
      }));
    });
  });

  // ============================================================================
  // SECURITY TESTS
  // ============================================================================

  describe('NoSQL Injection Prevention', () => {
    let req, res, next;

    beforeEach(() => {
      req = { query: {} };
      res = {};
      next = jest.fn();
    });

    test('should block $where injection attempt', async () => {
      req.query = {
        username: 'admin',
        $where: 'this.password == ""'
      };

      const middleware = sanitizeQuery();
      await middleware(req, res, next);

      expect(req.query.$where).toBeUndefined();
    });

    test('should block $ne authentication bypass', async () => {
      req.query = {
        username: 'admin',
        password: { $ne: null }
      };

      const middleware = sanitizeQuery();
      await middleware(req, res, next);

      expect(req.query.password.$ne).toBeUndefined();
    });

    test('should block regex injection', async () => {
      req.query = {
        search: '.*',
        $regex: '.*password.*'
      };

      const middleware = sanitizeQuery();
      await middleware(req, res, next);

      expect(req.query.$regex).toBeUndefined();
    });

    test('should block operator in string value', async () => {
      req.query = {
        filter: '$where: function() { return true; }'
      };

      const middleware = sanitizeQuery();
      await middleware(req, res, next);

      expect(req.query.filter).toBe(''); // Sanitized to empty
    });
  });

  describe('ReDoS Prevention', () => {
    test('should limit search string length', async () => {
      const req = {
        query: {
          search: 'a'.repeat(201) // Over 200 char limit
        }
      };
      const res = {};
      const next = jest.fn();

      const middleware = sanitizeQuery({ strict: true });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Query validation failed')
      }));
    });

    test('should limit sort string length', async () => {
      const req = {
        query: {
          sort: 'a'.repeat(101) // Over 100 char limit
        }
      };
      const res = {};
      const next = jest.fn();

      const middleware = sanitizeQuery({ strict: true });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Query validation failed')
      }));
    });
  });
});
