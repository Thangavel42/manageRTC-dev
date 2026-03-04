/**
 * Unit Tests for Common Validation Schemas
 * Tests Phase 3, Task 3.6
 *
 * @jest-environment node
 */

import { describe, test, expect } from '@jest/globals';
import {
  objectIdSchema,
  paginationSchema,
  dateRangeSchema,
  futureDateRangeSchema,
  searchSchema,
  sortSchema,
  statusSchema,
  emailSchema,
  phoneSchema,
  nameSchema,
  descriptionSchema,
  urlSchema,
  positiveNumberSchema,
  percentageSchema,
  booleanSchema,
  addressSchema,
  queryParamsSchema
} from '../../../../middleware/validation/schemas/common.schema.js';

describe('Common Validation Schemas - Unit Tests', () => {

  // ============================================================================
  // OBJECTID SCHEMA
  // ============================================================================

  describe('objectIdSchema', () => {
    test('should accept valid 24-character hex ObjectId', () => {
      const { error } = objectIdSchema.validate('507f1f77bcf86cd799439011');
      expect(error).toBeUndefined();
    });

    test('should accept uppercase hex characters', () => {
      const { error } = objectIdSchema.validate('507F1F77BCF86CD799439011');
      expect(error).toBeUndefined();
    });

    test('should reject ObjectId with less than 24 characters', () => {
      const { error } = objectIdSchema.validate('507f1f77bcf86cd79943901');
      expect(error).toBeDefined();
      expect(error.message).toContain('Invalid ObjectId format');
    });

    test('should reject ObjectId with more than 24 characters', () => {
      const { error } = objectIdSchema.validate('507f1f77bcf86cd7994390111');
      expect(error).toBeDefined();
    });

    test('should reject non-hex characters', () => {
      const { error } = objectIdSchema.validate('507f1f77bcf86cd79943901g');
      expect(error).toBeDefined();
    });

    test('should reject empty string', () => {
      const { error } = objectIdSchema.validate('');
      expect(error).toBeDefined();
    });
  });

  // ============================================================================
  // PAGINATION SCHEMA
  // ============================================================================

  describe('paginationSchema', () => {
    test('should accept valid pagination params', () => {
      const { error } = paginationSchema.validate({ page: 1, limit: 10 });
      expect(error).toBeUndefined();
    });

    test('should set default values', () => {
      const { value } = paginationSchema.validate({});
      expect(value.page).toBe(1);
      expect(value.limit).toBe(10);
    });

    test('should accept page 1 (minimum)', () => {
      const { error } = paginationSchema.validate({ page: 1 });
      expect(error).toBeUndefined();
    });

    test('should reject page 0', () => {
      const { error } = paginationSchema.validate({ page: 0 });
      expect(error).toBeDefined();
      expect(error.message).toContain('Page must be at least 1');
    });

    test('should reject page > 10000', () => {
      const { error } = paginationSchema.validate({ page: 10001 });
      expect(error).toBeDefined();
      expect(error.message).toContain('Page cannot exceed 10000');
    });

    test('should accept limit 1 (minimum)', () => {
      const { error } = paginationSchema.validate({ limit: 1 });
      expect(error).toBeUndefined();
    });

    test('should reject limit 0', () => {
      const { error } = paginationSchema.validate({ limit: 0 });
      expect(error).toBeDefined();
      expect(error.message).toContain('Limit must be at least 1');
    });

    test('should reject limit > 100', () => {
      const { error } = paginationSchema.validate({ limit: 101 });
      expect(error).toBeDefined();
      expect(error.message).toContain('Limit cannot exceed 100');
    });

    test('should reject non-integer page', () => {
      const { error } = paginationSchema.validate({ page: 1.5 });
      expect(error).toBeDefined();
    });

    test('should accept skip parameter', () => {
      const { error } = paginationSchema.validate({ skip: 20 });
      expect(error).toBeUndefined();
    });
  });

  // ============================================================================
  // DATE RANGE SCHEMA
  // ============================================================================

  describe('dateRangeSchema', () => {
    test('should accept valid date range', () => {
      const { error } = dateRangeSchema.validate({
        startDate: '2026-01-01',
        endDate: '2026-01-31'
      });
      expect(error).toBeUndefined();
    });

    test('should accept ISO date format', () => {
      const { error } = dateRangeSchema.validate({
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-01-31T23:59:59.999Z'
      });
      expect(error).toBeUndefined();
    });

    test('should reject end date before start date', () => {
      const { error } = dateRangeSchema.validate({
        startDate: '2026-01-31',
        endDate: '2026-01-01'
      });
      expect(error).toBeDefined();
      expect(error.message).toContain('End date must be after start date');
    });

    test('should reject future start date', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const { error } = dateRangeSchema.validate({
        startDate: futureDate.toISOString()
      });
      expect(error).toBeDefined();
      expect(error.message).toContain('Start date cannot be in the future');
    });

    test('should accept equal start and end dates', () => {
      const { error } = dateRangeSchema.validate({
        startDate: '2026-01-01',
        endDate: '2026-01-01'
      });
      expect(error).toBeUndefined();
    });

    test('should accept only startDate', () => {
      const { error } = dateRangeSchema.validate({
        startDate: '2026-01-01'
      });
      expect(error).toBeUndefined();
    });

    test('should accept only endDate', () => {
      const { error } = dateRangeSchema.validate({
        endDate: '2026-01-01'
      });
      expect(error).toBeUndefined();
    });
  });

  describe('futureDateRangeSchema', () => {
    test('should accept future dates', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const { error } = futureDateRangeSchema.validate({
        startDate: futureDate.toISOString()
      });
      expect(error).toBeUndefined();
    });
  });

  // ============================================================================
  // SEARCH SCHEMA
  // ============================================================================

  describe('searchSchema', () => {
    test('should accept valid search query', () => {
      const { error } = searchSchema.validate({ search: 'John Doe' });
      expect(error).toBeUndefined();
    });

    test('should accept alphanumeric with spaces', () => {
      const { error } = searchSchema.validate({ search: 'Employee 123' });
      expect(error).toBeUndefined();
    });

    test('should accept hyphens and underscores', () => {
      const { error } = searchSchema.validate({ search: 'John-Doe_123' });
      expect(error).toBeUndefined();
    });

    test('should accept email addresses', () => {
      const { error } = searchSchema.validate({ search: 'john.doe@example.com' });
      expect(error).toBeUndefined();
    });

    test('should reject special characters', () => {
      const { error } = searchSchema.validate({ search: 'John<script>' });
      expect(error).toBeDefined();
      expect(error.message).toContain('contains invalid characters');
    });

    test('should reject MongoDB operators', () => {
      const { error } = searchSchema.validate({ search: '$regex' });
      expect(error).toBeDefined();
    });

    test('should reject query > 200 characters', () => {
      const longQuery = 'a'.repeat(201);
      const { error } = searchSchema.validate({ search: longQuery });
      expect(error).toBeDefined();
      expect(error.message).toContain('Search query is too long');
    });

    test('should trim whitespace', () => {
      const { value } = searchSchema.validate({ search: '  John Doe  ' });
      expect(value.search).toBe('John Doe');
    });

    test('should accept q parameter', () => {
      const { error } = searchSchema.validate({ q: 'search query' });
      expect(error).toBeUndefined();
    });
  });

  // ============================================================================
  // SORT SCHEMA
  // ============================================================================

  describe('sortSchema', () => {
    test('should accept asc', () => {
      const { error } = sortSchema.validate({ sort: 'asc' });
      expect(error).toBeUndefined();
    });

    test('should accept desc', () => {
      const { error } = sortSchema.validate({ sort: 'desc' });
      expect(error).toBeUndefined();
    });

    test('should accept 1 and -1', () => {
      expect(sortSchema.validate({ sort: '1' }).error).toBeUndefined();
      expect(sortSchema.validate({ sort: '-1' }).error).toBeUndefined();
    });

    test('should reject invalid sort order', () => {
      const { error } = sortSchema.validate({ sort: 'invalid' });
      expect(error).toBeDefined();
    });

    test('should set default to asc', () => {
      const { value } = sortSchema.validate({});
      expect(value.sort).toBe('asc');
    });

    test('should accept sortBy field name', () => {
      const { error } = sortSchema.validate({ sortBy: 'createdAt' });
      expect(error).toBeUndefined();
    });

    test('should accept nested field names', () => {
      const { error } = sortSchema.validate({ sortBy: 'user.name' });
      expect(error).toBeUndefined();
    });

    test('should reject sortBy with special characters', () => {
      const { error } = sortSchema.validate({ sortBy: 'field$name' });
      expect(error).toBeDefined();
    });
  });

  // ============================================================================
  // EMAIL SCHEMA
  // ============================================================================

  describe('emailSchema', () => {
    test('should accept valid email', () => {
      const { error } = emailSchema.validate('john.doe@example.com');
      expect(error).toBeUndefined();
    });

    test('should lowercase email', () => {
      const { value } = emailSchema.validate('JOHN.DOE@EXAMPLE.COM');
      expect(value).toBe('john.doe@example.com');
    });

    test('should trim whitespace', () => {
      const { value } = emailSchema.validate('  john@example.com  ');
      expect(value).toBe('john@example.com');
    });

    test('should reject invalid email format', () => {
      const { error } = emailSchema.validate('invalid-email');
      expect(error).toBeDefined();
      expect(error.message).toContain('Invalid email format');
    });

    test('should reject email > 100 characters', () => {
      const longEmail = 'a'.repeat(90) + '@example.com';
      const { error } = emailSchema.validate(longEmail);
      expect(error).toBeDefined();
    });
  });

  // ============================================================================
  // PHONE SCHEMA
  // ============================================================================

  describe('phoneSchema', () => {
    test('should accept valid phone number', () => {
      const { error } = phoneSchema.validate('+1234567890');
      expect(error).toBeUndefined();
    });

    test('should accept phone without plus sign', () => {
      const { error } = phoneSchema.validate('1234567890');
      expect(error).toBeUndefined();
    });

    test('should reject phone with letters', () => {
      const { error } = phoneSchema.validate('123abc7890');
      expect(error).toBeDefined();
    });

    test('should reject phone < 10 digits', () => {
      const { error } = phoneSchema.validate('123456789');
      expect(error).toBeDefined();
    });

    test('should reject phone > 15 digits', () => {
      const { error } = phoneSchema.validate('1234567890123456');
      expect(error).toBeDefined();
    });
  });

  // ============================================================================
  // NAME SCHEMA
  // ============================================================================

  describe('nameSchema', () => {
    test('should accept valid name', () => {
      const { error } = nameSchema.validate('John Doe');
      expect(error).toBeUndefined();
    });

    test('should accept hyphenated names', () => {
      const { error } = nameSchema.validate("Mary-Jane");
      expect(error).toBeUndefined();
    });

    test('should accept apostrophes', () => {
      const { error } = nameSchema.validate("O'Connor");
      expect(error).toBeUndefined();
    });

    test('should trim whitespace', () => {
      const { value } = nameSchema.validate('  John Doe  ');
      expect(value).toBe('John Doe');
    });

    test('should reject numbers in name', () => {
      const { error } = nameSchema.validate('John123');
      expect(error).toBeDefined();
    });

    test('should reject special characters', () => {
      const { error } = nameSchema.validate('John@Doe');
      expect(error).toBeDefined();
    });

    test('should reject empty string', () => {
      const { error } = nameSchema.validate('');
      expect(error).toBeDefined();
    });

    test('should reject name > 50 characters', () => {
      const longName = 'a'.repeat(51);
      const { error } = nameSchema.validate(longName);
      expect(error).toBeDefined();
    });
  });

  // ============================================================================
  // POSITIVE NUMBER SCHEMA
  // ============================================================================

  describe('positiveNumberSchema', () => {
    test('should accept positive numbers', () => {
      expect(positiveNumberSchema.validate(1).error).toBeUndefined();
      expect(positiveNumberSchema.validate(100.5).error).toBeUndefined();
    });

    test('should reject zero', () => {
      const { error } = positiveNumberSchema.validate(0);
      expect(error).toBeDefined();
    });

    test('should reject negative numbers', () => {
      const { error } = positiveNumberSchema.validate(-5);
      expect(error).toBeDefined();
    });
  });

  // ============================================================================
  // PERCENTAGE SCHEMA
  // ============================================================================

  describe('percentageSchema', () => {
    test('should accept 0%', () => {
      const { error } = percentageSchema.validate(0);
      expect(error).toBeUndefined();
    });

    test('should accept 100%', () => {
      const { error } = percentageSchema.validate(100);
      expect(error).toBeUndefined();
    });

    test('should accept decimals', () => {
      const { error } = percentageSchema.validate(50.5);
      expect(error).toBeUndefined();
    });

    test('should reject negative percentages', () => {
      const { error } = percentageSchema.validate(-1);
      expect(error).toBeDefined();
    });

    test('should reject > 100%', () => {
      const { error } = percentageSchema.validate(101);
      expect(error).toBeDefined();
    });
  });

  // ============================================================================
  // BOOLEAN SCHEMA
  // ============================================================================

  describe('booleanSchema', () => {
    test('should accept true/false', () => {
      expect(booleanSchema.validate(true).error).toBeUndefined();
      expect(booleanSchema.validate(false).error).toBeUndefined();
    });

    test('should accept string true/false', () => {
      expect(booleanSchema.validate('true').error).toBeUndefined();
      expect(booleanSchema.validate('false').error).toBeUndefined();
    });

    test('should accept 1/0', () => {
      expect(booleanSchema.validate('1').error).toBeUndefined();
      expect(booleanSchema.validate('0').error).toBeUndefined();
    });

    test('should accept yes/no', () => {
      expect(booleanSchema.validate('yes').error).toBeUndefined();
      expect(booleanSchema.validate('no').error).toBeUndefined();
    });

    test('should reject invalid strings', () => {
      const { error } = booleanSchema.validate('invalid');
      expect(error).toBeDefined();
    });
  });

  // ============================================================================
  // URL SCHEMA
  // ============================================================================

  describe('urlSchema', () => {
    test('should accept valid HTTP URL', () => {
      const { error } = urlSchema.validate('http://example.com');
      expect(error).toBeUndefined();
    });

    test('should accept valid HTTPS URL', () => {
      const { error } = urlSchema.validate('https://example.com/path?query=value');
      expect(error).toBeUndefined();
    });

    test('should reject invalid URL', () => {
      const { error} = urlSchema.validate('not-a-url');
      expect(error).toBeDefined();
    });

    test('should reject URL > 500 characters', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(500);
      const { error } = urlSchema.validate(longUrl);
      expect(error).toBeDefined();
    });
  });

  // ============================================================================
  // QUERY PARAMS SCHEMA
  // ============================================================================

  describe('queryParamsSchema', () => {
    test('should accept combined pagination, search, sort, status', () => {
      const { error } = queryParamsSchema.validate({
        page: 1,
        limit: 20,
        search: 'test',
        sort: 'asc',
        sortBy: 'name',
        status: 'active'
      });
      expect(error).toBeUndefined();
    });

    test('should set defaults for pagination', () => {
      const { value } = queryParamsSchema.validate({});
      expect(value.page).toBe(1);
      expect(value.limit).toBe(10);
      expect(value.sort).toBe('asc');
    });

    test('should strip unknown fields', () => {
      const { value } = queryParamsSchema.validate({
        page: 1,
        unknownField: 'value'
      }, { stripUnknown: true });
      expect(value.unknownField).toBeUndefined();
    });
  });
});
