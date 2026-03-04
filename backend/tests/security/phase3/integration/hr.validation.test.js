/**
 * Integration Tests for HR Module Route Validation
 * Tests Phase 3, Task 3.7
 *
 * Covers: Departments, Designations, Holidays, Policies
 *
 * Tests that validation middleware correctly rejects invalid requests
 * and allows valid requests to proceed to controllers.
 *
 * @jest-environment node
 */

import { describe, test, expect } from '@jest/globals';

describe('HR Modules - Validation Integration Tests', () => {

  // ============================================================================
  // DEPARTMENTS MODULE
  // ============================================================================

  describe('Departments Routes - Validation', () => {
    const validDepartment = {
      name: 'Engineering',
      code: 'ENG-001',
      description: 'Software engineering department',
      headOfDepartment: '507f1f77bcf86cd799439011',
      isActive: true
    };

    describe('POST /api/departments - Create Department Validation', () => {
      test('should reject request without name', () => {
        const invalidRequest = { ...validDepartment };
        delete invalidRequest.name;

        expect(() => {
          const { createDepartmentSchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = createDepartmentSchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow(/Department name is required/);
      });

      test('should reject short name (<2 characters)', () => {
        const invalidRequest = {
          ...validDepartment,
          name: 'A'
        };

        expect(() => {
          const { createDepartmentSchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = createDepartmentSchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow(/at least 2 characters/);
      });

      test('should reject long name (>100 characters)', () => {
        const invalidRequest = {
          ...validDepartment,
          name: 'A'.repeat(101)
        };

        expect(() => {
          const { createDepartmentSchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = createDepartmentSchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow();
      });

      test('should reject invalid code format', () => {
        const invalidRequest = {
          ...validDepartment,
          code: 'invalid code!'
        };

        expect(() => {
          const { createDepartmentSchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = createDepartmentSchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow(/uppercase letters, numbers, hyphens, and underscores/);
      });

      test('should reject lowercase code', () => {
        const invalidRequest = {
          ...validDepartment,
          code: 'eng-001'
        };

        expect(() => {
          const { createDepartmentSchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = createDepartmentSchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow(/uppercase/);
      });

      test('should reject long description (>2000 characters)', () => {
        const invalidRequest = {
          ...validDepartment,
          description: 'A'.repeat(2001)
        };

        expect(() => {
          const { createDepartmentSchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = createDepartmentSchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow();
      });

      test('should reject invalid headOfDepartment ObjectId', () => {
        const invalidRequest = {
          ...validDepartment,
          headOfDepartment: 'invalid-id'
        };

        expect(() => {
          const { createDepartmentSchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = createDepartmentSchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow(/Invalid ObjectId/);
      });

      test('should reject invalid parentDepartment ObjectId', () => {
        const invalidRequest = {
          ...validDepartment,
          parentDepartment: 'invalid-id'
        };

        expect(() => {
          const { createDepartmentSchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = createDepartmentSchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow(/Invalid ObjectId/);
      });

      test('should accept valid department request', () => {
        const { createDepartmentSchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
        const { error } = createDepartmentSchema.validate(validDepartment);
        expect(error).toBeUndefined();
      });
    });

    describe('PUT /api/departments/:id - Update Department Validation', () => {
      test('should reject empty update', () => {
        const invalidRequest = {};

        expect(() => {
          const { updateDepartmentSchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = updateDepartmentSchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow(/At least one field must be provided/);
      });

      test('should accept partial update', () => {
        const validRequest = {
          name: 'Updated Engineering'
        };

        const { updateDepartmentSchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
        const { error } = updateDepartmentSchema.validate(validRequest);
        expect(error).toBeUndefined();
      });
    });

    describe('GET /api/departments - Query Validation', () => {
      test('should reject page < 1', () => {
        const invalidQuery = { page: 0 };

        expect(() => {
          const { departmentQuerySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = departmentQuerySchema.validate(invalidQuery);
          if (error) throw error;
        }).toThrow(/Page must be at least 1/);
      });

      test('should accept valid query', () => {
        const validQuery = {
          page: 1,
          limit: 20,
          search: 'Engineering',
          isActive: true
        };

        const { departmentQuerySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
        const { error } = departmentQuerySchema.validate(validQuery);
        expect(error).toBeUndefined();
      });
    });
  });

  // ============================================================================
  // DESIGNATIONS MODULE
  // ============================================================================

  describe('Designations Routes - Validation', () => {
    const validDesignation = {
      name: 'Senior Software Engineer',
      code: 'SSE-001',
      description: 'Senior level software engineer position',
      level: 5,
      department: '507f1f77bcf86cd799439011',
      isActive: true
    };

    describe('POST /api/designations - Create Designation Validation', () => {
      test('should reject request without name', () => {
        const invalidRequest = { ...validDesignation };
        delete invalidRequest.name;

        expect(() => {
          const { createDesignationSchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = createDesignationSchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow(/Designation name is required/);
      });

      test('should reject short name (<2 characters)', () => {
        const invalidRequest = {
          ...validDesignation,
          name: 'A'
        };

        expect(() => {
          const { createDesignationSchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = createDesignationSchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow(/at least 2 characters/);
      });

      test('should reject invalid code format', () => {
        const invalidRequest = {
          ...validDesignation,
          code: 'invalid code!'
        };

        expect(() => {
          const { createDesignationSchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = createDesignationSchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow(/uppercase letters, numbers, hyphens, and underscores/);
      });

      test('should reject level < 1', () => {
        const invalidRequest = {
          ...validDesignation,
          level: 0
        };

        expect(() => {
          const { createDesignationSchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = createDesignationSchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow(/Level must be between 1 and 10/);
      });

      test('should reject level > 10', () => {
        const invalidRequest = {
          ...validDesignation,
          level: 11
        };

        expect(() => {
          const { createDesignationSchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = createDesignationSchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow(/Level must be between 1 and 10/);
      });

      test('should reject invalid department ObjectId', () => {
        const invalidRequest = {
          ...validDesignation,
          department: 'invalid-id'
        };

        expect(() => {
          const { createDesignationSchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = createDesignationSchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow(/Invalid ObjectId/);
      });

      test('should reject invalid parentDesignation ObjectId', () => {
        const invalidRequest = {
          ...validDesignation,
          parentDesignation: 'invalid-id'
        };

        expect(() => {
          const { createDesignationSchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = createDesignationSchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow(/Invalid ObjectId/);
      });

      test('should accept valid designation request', () => {
        const { createDesignationSchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
        const { error } = createDesignationSchema.validate(validDesignation);
        expect(error).toBeUndefined();
      });
    });

    describe('PUT /api/designations/:id - Update Designation Validation', () => {
      test('should reject empty update', () => {
        const invalidRequest = {};

        expect(() => {
          const { updateDesignationSchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = updateDesignationSchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow(/At least one field must be provided/);
      });

      test('should accept partial update', () => {
        const validRequest = {
          name: 'Updated Senior Software Engineer',
          level: 6
        };

        const { updateDesignationSchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
        const { error } = updateDesignationSchema.validate(validRequest);
        expect(error).toBeUndefined();
      });
    });

    describe('GET /api/designations - Query Validation', () => {
      test('should reject invalid level filter', () => {
        const invalidQuery = { level: 15 };

        expect(() => {
          const { designationQuerySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = designationQuerySchema.validate(invalidQuery);
          if (error) throw error;
        }).toThrow();
      });

      test('should accept valid query', () => {
        const validQuery = {
          page: 1,
          limit: 20,
          search: 'Engineer',
          level: 5,
          isActive: true
        };

        const { designationQuerySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
        const { error } = designationQuerySchema.validate(validQuery);
        expect(error).toBeUndefined();
      });
    });
  });

  // ============================================================================
  // HOLIDAYS MODULE
  // ============================================================================

  describe('Holidays Routes - Validation', () => {
    const validHoliday = {
      name: 'Independence Day',
      date: '2026-08-15',
      type: 'national',
      year: 2026,
      description: 'National holiday celebrating independence'
    };

    describe('POST /api/holidays - Create Holiday Validation', () => {
      test('should reject request without name', () => {
        const invalidRequest = { ...validHoliday };
        delete invalidRequest.name;

        expect(() => {
          const { createHolidaySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = createHolidaySchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow(/Holiday name is required/);
      });

      test('should reject short name (<2 characters)', () => {
        const invalidRequest = {
          ...validHoliday,
          name: 'A'
        };

        expect(() => {
          const { createHolidaySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = createHolidaySchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow(/at least 2 characters/);
      });

      test('should reject request without date', () => {
        const invalidRequest = { ...validHoliday };
        delete invalidRequest.date;

        expect(() => {
          const { createHolidaySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = createHolidaySchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow(/Date is required/);
      });

      test('should reject invalid holiday type', () => {
        const invalidRequest = {
          ...validHoliday,
          type: 'invalid_type'
        };

        expect(() => {
          const { createHolidaySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = createHolidaySchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow();
      });

      test('should accept all valid holiday types', () => {
        const types = ['public', 'national', 'regional', 'company', 'optional', 'restricted'];

        types.forEach(type => {
          const { createHolidaySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = createHolidaySchema.validate({ ...validHoliday, type });
          expect(error).toBeUndefined();
        });
      });

      test('should reject year < 2020', () => {
        const invalidRequest = {
          ...validHoliday,
          year: 2019
        };

        expect(() => {
          const { createHolidaySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = createHolidaySchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow(/Year must be between 2020 and 2050/);
      });

      test('should reject year > 2050', () => {
        const invalidRequest = {
          ...validHoliday,
          year: 2051
        };

        expect(() => {
          const { createHolidaySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = createHolidaySchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow(/Year must be between 2020 and 2050/);
      });

      test('should reject invalid applicableDepartments ObjectId', () => {
        const invalidRequest = {
          ...validHoliday,
          applicableDepartments: ['invalid-id']
        };

        expect(() => {
          const { createHolidaySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = createHolidaySchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow(/Invalid ObjectId/);
      });

      test('should accept valid holiday request', () => {
        const { createHolidaySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
        const { error } = createHolidaySchema.validate(validHoliday);
        expect(error).toBeUndefined();
      });

      test('should accept holiday with applicable departments', () => {
        const validRequest = {
          ...validHoliday,
          applicableDepartments: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012']
        };

        const { createHolidaySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
        const { error } = createHolidaySchema.validate(validRequest);
        expect(error).toBeUndefined();
      });
    });

    describe('POST /api/holidays/calculate - Calculate Working Days Validation', () => {
      test('should reject request without startDate', () => {
        const invalidRequest = {
          endDate: '2026-08-31'
        };

        expect(() => {
          const { calculateWorkingDaysSchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = calculateWorkingDaysSchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow(/Start date is required/);
      });

      test('should reject request without endDate', () => {
        const invalidRequest = {
          startDate: '2026-08-01'
        };

        expect(() => {
          const { calculateWorkingDaysSchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = calculateWorkingDaysSchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow(/End date is required/);
      });

      test('should reject endDate before startDate', () => {
        const invalidRequest = {
          startDate: '2026-08-31',
          endDate: '2026-08-01'
        };

        expect(() => {
          const { calculateWorkingDaysSchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = calculateWorkingDaysSchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow(/End date must be on or after start date/);
      });

      test('should accept valid working days calculation request', () => {
        const validRequest = {
          startDate: '2026-08-01',
          endDate: '2026-08-31',
          excludeWeekends: true
        };

        const { calculateWorkingDaysSchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
        const { error } = calculateWorkingDaysSchema.validate(validRequest);
        expect(error).toBeUndefined();
      });
    });

    describe('POST /api/holidays/validate - Validate Holiday Validation', () => {
      test('should reject request without date', () => {
        const invalidRequest = {};

        expect(() => {
          const { validateHolidaySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = validateHolidaySchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow(/Date is required/);
      });

      test('should accept valid holiday validation request', () => {
        const validRequest = {
          date: '2026-08-15'
        };

        const { validateHolidaySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
        const { error } = validateHolidaySchema.validate(validRequest);
        expect(error).toBeUndefined();
      });
    });

    describe('PUT /api/holidays/:id - Update Holiday Validation', () => {
      test('should reject empty update', () => {
        const invalidRequest = {};

        expect(() => {
          const { updateHolidaySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = updateHolidaySchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow(/At least one field must be provided/);
      });

      test('should accept partial update', () => {
        const validRequest = {
          name: 'Updated Holiday Name',
          description: 'Updated description'
        };

        const { updateHolidaySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
        const { error } = updateHolidaySchema.validate(validRequest);
        expect(error).toBeUndefined();
      });
    });

    describe('GET /api/holidays - Query Validation', () => {
      test('should reject invalid type', () => {
        const invalidQuery = { type: 'invalid' };

        expect(() => {
          const { holidayQuerySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = holidayQuerySchema.validate(invalidQuery);
          if (error) throw error;
        }).toThrow();
      });

      test('should accept valid query', () => {
        const validQuery = {
          page: 1,
          limit: 20,
          type: 'national',
          year: 2026,
          month: 8
        };

        const { holidayQuerySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
        const { error } = holidayQuerySchema.validate(validQuery);
        expect(error).toBeUndefined();
      });
    });
  });

  // ============================================================================
  // POLICIES MODULE
  // ============================================================================

  describe('Policies Routes - Validation', () => {
    const validPolicy = {
      title: 'Leave Policy 2026',
      category: 'leave',
      content: 'This is a comprehensive leave policy document that outlines all leave types, eligibility criteria, and approval processes.',
      version: '1.0',
      effectiveDate: '2026-01-01',
      isActive: true
    };

    describe('POST /api/policies - Create Policy Validation', () => {
      test('should reject request without title', () => {
        const invalidRequest = { ...validPolicy };
        delete invalidRequest.title;

        expect(() => {
          const { createPolicySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = createPolicySchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow(/Title is required/);
      });

      test('should reject short title (<5 characters)', () => {
        const invalidRequest = {
          ...validPolicy,
          title: 'Test'
        };

        expect(() => {
          const { createPolicySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = createPolicySchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow(/Title must be at least 5 characters/);
      });

      test('should reject long title (>200 characters)', () => {
        const invalidRequest = {
          ...validPolicy,
          title: 'A'.repeat(201)
        };

        expect(() => {
          const { createPolicySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = createPolicySchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow();
      });

      test('should reject request without category', () => {
        const invalidRequest = { ...validPolicy };
        delete invalidRequest.category;

        expect(() => {
          const { createPolicySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = createPolicySchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow(/Category is required/);
      });

      test('should reject invalid category', () => {
        const invalidRequest = {
          ...validPolicy,
          category: 'invalid_category'
        };

        expect(() => {
          const { createPolicySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = createPolicySchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow();
      });

      test('should accept all valid categories', () => {
        const categories = ['leave', 'attendance', 'code_of_conduct', 'data_security', 'hr', 'it', 'safety', 'other'];

        categories.forEach(category => {
          const { createPolicySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = createPolicySchema.validate({ ...validPolicy, category });
          expect(error).toBeUndefined();
        });
      });

      test('should reject request without content', () => {
        const invalidRequest = { ...validPolicy };
        delete invalidRequest.content;

        expect(() => {
          const { createPolicySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = createPolicySchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow(/Content is required/);
      });

      test('should reject short content (<50 characters)', () => {
        const invalidRequest = {
          ...validPolicy,
          content: 'Too short content'
        };

        expect(() => {
          const { createPolicySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = createPolicySchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow(/Content must be at least 50 characters/);
      });

      test('should reject invalid version format', () => {
        const invalidRequest = {
          ...validPolicy,
          version: 'invalid'
        };

        expect(() => {
          const { createPolicySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = createPolicySchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow(/Invalid version format/);
      });

      test('should accept valid version formats', () => {
        const versions = ['1.0', 'v1.0', '1.0.0', 'v1.0.0', '2.5.3'];

        versions.forEach(version => {
          const { createPolicySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = createPolicySchema.validate({ ...validPolicy, version });
          expect(error).toBeUndefined();
        });
      });

      test('should reject expiryDate before effectiveDate', () => {
        const invalidRequest = {
          ...validPolicy,
          effectiveDate: '2026-12-31',
          expiryDate: '2026-01-01'
        };

        expect(() => {
          const { createPolicySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = createPolicySchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow(/Expiry date must be after effective date/);
      });

      test('should reject more than 10 attachments', () => {
        const invalidRequest = {
          ...validPolicy,
          attachments: new Array(11).fill('https://example.com/file.pdf')
        };

        expect(() => {
          const { createPolicySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = createPolicySchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow(/Cannot attach more than 10 files/);
      });

      test('should accept valid policy request', () => {
        const { createPolicySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
        const { error } = createPolicySchema.validate(validPolicy);
        expect(error).toBeUndefined();
      });

      test('should accept policy with attachments', () => {
        const validRequest = {
          ...validPolicy,
          attachments: [
            'https://example.com/file1.pdf',
            'https://example.com/file2.pdf'
          ]
        };

        const { createPolicySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
        const { error } = createPolicySchema.validate(validRequest);
        expect(error).toBeUndefined();
      });
    });

    describe('PUT /api/policies/:id - Update Policy Validation', () => {
      test('should reject empty update', () => {
        const invalidRequest = {};

        expect(() => {
          const { updatePolicySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = updatePolicySchema.validate(invalidRequest);
          if (error) throw error;
        }).toThrow(/At least one field must be provided/);
      });

      test('should accept partial update', () => {
        const validRequest = {
          title: 'Updated Leave Policy 2026',
          version: '2.0'
        };

        const { updatePolicySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
        const { error } = updatePolicySchema.validate(validRequest);
        expect(error).toBeUndefined();
      });
    });

    describe('GET /api/policies - Query Validation', () => {
      test('should reject invalid category', () => {
        const invalidQuery = { category: 'invalid' };

        expect(() => {
          const { policyQuerySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
          const { error } = policyQuerySchema.validate(invalidQuery);
          if (error) throw error;
        }).toThrow();
      });

      test('should accept valid query', () => {
        const validQuery = {
          page: 1,
          limit: 20,
          category: 'leave',
          search: 'policy',
          isActive: true
        };

        const { policyQuerySchema } = require('../../../../middleware/validation/schemas/hr.schema.js');
        const { error } = policyQuerySchema.validate(validQuery);
        expect(error).toBeUndefined();
      });
    });
  });
});
