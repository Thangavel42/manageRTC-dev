/**
 * Unit Tests for NoSQL Injection Prevention Utilities
 * Tests: backend/utils/sanitization.js
 */

import {
  escapeRegex,
  validateSearchInput,
  isValidObjectId,
  sanitizeQueryObject,
  sanitizePaginationParams
} from '../../utils/sanitization.js';

describe('NoSQL Injection Prevention - sanitization.js', () => {

  describe('escapeRegex()', () => {
    test('should escape regex special characters', () => {
      expect(escapeRegex('.*+?^${}()|[]')).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]');
    });

    test('should handle strings without special characters', () => {
      expect(escapeRegex('hello world')).toBe('hello world');
    });

    test('should throw TypeError for non-string input', () => {
      expect(() => escapeRegex(123)).toThrow(TypeError);
      expect(() => escapeRegex(null)).toThrow(TypeError);
      expect(() => escapeRegex({})).toThrow(TypeError);
    });

    test('should escape backslashes correctly', () => {
      expect(escapeRegex('test\\regex')).toBe('test\\\\regex');
    });

    test('should handle empty string', () => {
      expect(escapeRegex('')).toBe('');
    });
  });

  describe('validateSearchInput()', () => {
    test('should allow valid search strings', () => {
      expect(validateSearchInput('John Doe')).toBe('John Doe');
      expect(validateSearchInput('employee@example.com')).toBe('employee@example.com');
      expect(validateSearchInput('Project-123')).toBe('Project-123');
    });

    test('should block MongoDB operator $where', () => {
      expect(() => validateSearchInput('$where')).toThrow('MongoDB operator "$where" not allowed');
      expect(() => validateSearchInput('{$where: "sleep(5000)"}')).toThrow();
    });

    test('should block all dangerous MongoDB operators', () => {
      const operators = ['$where', '$regex', '$ne', '$gt', '$lt', '$gte', '$lte',
                         '$in', '$nin', '$exists', '$type', '$expr', '$jsonSchema'];

      operators.forEach(op => {
        expect(() => validateSearchInput(`test ${op} query`)).toThrow();
      });
    });

    test('should block JSON object strings', () => {
      expect(() => validateSearchInput('{"$where": "sleep(5000)"}')).toThrow('JSON objects not allowed');
      expect(() => validateSearchInput('[1,2,3]')).toThrow('JSON objects not allowed');
      expect(() => validateSearchInput('  {"key": "value"}')).toThrow();
    });

    test('should throw error for non-string input', () => {
      expect(() => validateSearchInput(123)).toThrow('Search query must be a string');
      expect(() => validateSearchInput({})).toThrow();
      expect(() => validateSearchInput(null)).toThrow();
    });

    test('should be case-insensitive for operator detection', () => {
      expect(() => validateSearchInput('$WHERE')).toThrow();
      expect(() => validateSearchInput('$NeW')).toThrow();
    });
  });

  describe('isValidObjectId()', () => {
    test('should validate correct MongoDB ObjectId format', () => {
      expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
      expect(isValidObjectId('5f8d04a6e7179a6b9c8e4f3a')).toBe(true);
    });

    test('should reject invalid ObjectId formats', () => {
      expect(isValidObjectId('invalid-id')).toBe(false);
      expect(isValidObjectId('507f1f77bcf86cd79943901')).toBe(false); // Too short
      expect(isValidObjectId('507f1f77bcf86cd7994390111')).toBe(false); // Too long
      expect(isValidObjectId('507f1f77bcf86cd79943901g')).toBe(false); // Invalid character
    });

    test('should reject non-string inputs', () => {
      expect(isValidObjectId(123)).toBe(false);
      expect(isValidObjectId(null)).toBe(false);
      expect(isValidObjectId(undefined)).toBe(false);
      expect(isValidObjectId({})).toBe(false);
    });

    test('should reject empty strings', () => {
      expect(isValidObjectId('')).toBe(false);
      expect(isValidObjectId('  ')).toBe(false);
    });
  });

  describe('sanitizeQueryObject()', () => {
    test('should remove MongoDB operators from flat objects', () => {
      const query = {
        name: 'John',
        $where: 'sleep(5000)',
        $ne: 'admin'
      };

      const sanitized = sanitizeQueryObject(query);
      expect(sanitized).toEqual({ name: 'John' });
      expect(sanitized.$where).toBeUndefined();
      expect(sanitized.$ne).toBeUndefined();
    });

    test('should remove MongoDB operators from nested objects', () => {
      const query = {
        name: 'John',
        filter: {
          $gt: 100,
          age: 30
        }
      };

      const sanitized = sanitizeQueryObject(query);
      expect(sanitized.filter.$gt).toBeUndefined();
      expect(sanitized.filter.age).toBe(30);
    });

    test('should not modify original object', () => {
      const original = { $where: 'test', name: 'John' };
      const sanitized = sanitizeQueryObject(original);

      expect(original.$where).toBe('test'); // Original unchanged
      expect(sanitized.$where).toBeUndefined();
    });

    test('should handle null and undefined gracefully', () => {
      expect(sanitizeQueryObject(null)).toEqual({});
      expect(sanitizeQueryObject(undefined)).toEqual({});
    });

    test('should preserve arrays and non-operator fields', () => {
      const query = {
        tags: ['admin', 'user'],
        $in: ['value1', 'value2'],
        count: 5
      };

      const sanitized = sanitizeQueryObject(query);
      expect(sanitized.tags).toEqual(['admin', 'user']);
      expect(sanitized.count).toBe(5);
      expect(sanitized.$in).toBeUndefined();
    });
  });

  describe('sanitizePaginationParams()', () => {
    test('should enforce maximum limit', () => {
      const result = sanitizePaginationParams({ limit: 500 });
      expect(result.limit).toBe(100); // MAX_LIMIT
    });

    test('should allow limits within bounds', () => {
      const result = sanitizePaginationParams({ limit: 50 });
      expect(result.limit).toBe(50);
    });

    test('should handle negative limits', () => {
      const result = sanitizePaginationParams({ limit: -10 });
      expect(result.limit).toBe(10); // Default
    });

    test('should set default limit when not provided', () => {
      const result = sanitizePaginationParams({});
      expect(result.limit).toBe(10); // Default limit
    });

    test('should handle offset parameter', () => {
      const result = sanitizePaginationParams({ offset: 20 });
      expect(result.offset).toBe(20);
    });

    test('should reject negative offset', () => {
      const result = sanitizePaginationParams({ offset: -5 });
      expect(result.offset).toBe(0);
    });

    test('should parse string numbers correctly', () => {
      const result = sanitizePaginationParams({ limit: '25', offset: '10' });
      expect(result.limit).toBe(25);
      expect(result.offset).toBe(10);
    });

    test('should handle invalid number strings', () => {
      const result = sanitizePaginationParams({ limit: 'abc', offset: 'xyz' });
      expect(result.limit).toBe(10); // Default
      expect(result.offset).toBe(0); // Default
    });
  });
});
