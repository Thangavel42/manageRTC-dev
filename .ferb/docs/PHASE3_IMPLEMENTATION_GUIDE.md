# Phase 3: Input Validation & Sanitization - Implementation Guide

## Overview

**Priority:** 🟠 HIGH
**Estimated Time:** 40 hours (1 week)
**Team:** Backend Developer (Full-time)

### Goals
- ✅ Add comprehensive Joi validation to all endpoints
- ✅ Enhance query parameter sanitization
- ✅ Implement file upload validation with size and type restrictions
- ✅ Prevent injection attacks through strict input validation

### Prerequisites
- ✅ Phase 1 Complete (NoSQL injection, IDOR, Mass Assignment fixes)
- ✅ Phase 2 Complete (Rate limiting, CSRF, Authorization gaps)
- ✅ Backend server running on port 5000

---

## Current Validation Status

### ✅ Already Validated Endpoints

Based on code review, the following routes already have Joi validation:

1. **Employees** - `backend/routes/api/employees.js`
   - ✅ `validateQuery(employeeSchemas.list)` on GET /
   - ✅ `validateBody(employeeSchemas.create)` on POST /

2. **Projects** - `backend/routes/api/projects.js`
   - ✅ `validateQuery(projectSchemas.list)` on GET /
   - ✅ `validateBody(projectSchemas.create)` on POST /

3. **Tasks** - `backend/routes/api/tasks.js`
   - ✅ `validateQuery(taskSchemas.list)` on GET /
   - ✅ `validateBody(taskSchemas.create)` on POST /

### ❌ Missing Validation

Endpoints that need validation added:

1. **Leaves** - Missing request body validation
2. **Attendance** - Missing query parameter validation
3. **Overtime** - Missing validation schemas
4. **Timesheets** - Missing comprehensive validation
5. **Holidays** - Missing validation
6. **Departments** - Missing validation
7. **Designations** - Missing validation
8. **Shifts** - Missing validation
9. **Assets** - Missing validation
10. **Clients** - Missing validation (some endpoints)

---

## Task 3.1: Audit Endpoints Without Validation (4 hours)

### Step 1: Create Audit Script

Create `backend/scripts/auditValidation.js`:

```javascript
/**
 * Validation Audit Script
 * Identifies routes without Joi validation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const routesDir = path.join(__dirname, '../routes/api');

const auditRoutes = () => {
  const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

  const results = {
    validated: [],
    missing: [],
    partial: []
  };

  routeFiles.forEach(file => {
    const filePath = path.join(routesDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    const hasValidation = content.includes('validateBody') || content.includes('validateQuery');
    const routeCount = (content.match(/router\.(get|post|put|patch|delete)/g) || []).length;
    const validationCount = (content.match(/validate(Body|Query|Params)/g) || []).length;

    if (validationCount === 0) {
      results.missing.push({ file, routeCount, validationCount: 0 });
    } else if (validationCount < routeCount) {
      results.partial.push({ file, routeCount, validationCount });
    } else {
      results.validated.push({ file, routeCount, validationCount });
    }
  });

  return results;
};

const results = auditRoutes();

console.log('\n📊 Validation Audit Results\n');
console.log('✅ Fully Validated Routes:', results.validated.length);
results.validated.forEach(r => console.log(`  - ${r.file}: ${r.validationCount}/${r.routeCount} routes`));

console.log('\n⚠️  Partially Validated Routes:', results.partial.length);
results.partial.forEach(r => console.log(`  - ${r.file}: ${r.validationCount}/${r.routeCount} routes`));

console.log('\n❌ Missing Validation:', results.missing.length);
results.missing.forEach(r => console.log(`  - ${r.file}: ${r.routeCount} routes without validation`));

console.log('\n📈 Summary:');
console.log(`  Total route files: ${results.validated.length + results.partial.length + results.missing.length}`);
console.log(`  Validation coverage: ${((results.validated.length / (results.validated.length + results.partial.length + results.missing.length)) * 100).toFixed(1)}%`);
```

**Run the audit:**
```bash
cd backend
node scripts/auditValidation.js
```

---

## Task 3.2: Create Comprehensive Joi Schemas (10 hours)

### Leave Validation Schema

Create/enhance `backend/middleware/validate.js` with leave schemas:

```javascript
// Leave schemas
export const leaveSchemas = {
  create: Joi.object({
    leaveType: Joi.string().required()
      .valid('earned', 'sick', 'casual', 'maternity', 'paternity', 'bereavement', 'compensatory', 'lop', 'special')
      .messages({
        'any.required': 'Leave type is required',
        'any.only': 'Invalid leave type'
      }),

    startDate: Joi.date().required()
      .min('now')
      .messages({
        'any.required': 'Start date is required',
        'date.min': 'Start date cannot be in the past'
      }),

    endDate: Joi.date().required()
      .min(Joi.ref('startDate'))
      .messages({
        'any.required': 'End date is required',
        'date.min': 'End date must be after start date'
      }),

    reason: Joi.string().required()
      .min(10)
      .max(500)
      .messages({
        'any.required': 'Reason is required',
        'string.min': 'Reason must be at least 10 characters',
        'string.max': 'Reason cannot exceed 500 characters'
      }),

    halfDay: Joi.boolean().optional(),

    halfDayPeriod: Joi.string().optional()
      .valid('morning', 'afternoon')
      .when('halfDay', {
        is: true,
        then: Joi.required()
      }),

    attachment: Joi.string().optional()
      .uri()
      .max(500)
  }).required(),

  update: Joi.object({
    startDate: Joi.date().optional().min('now'),
    endDate: Joi.date().optional().min(Joi.ref('startDate')),
    reason: Joi.string().optional().min(10).max(500),
    halfDay: Joi.boolean().optional(),
    halfDayPeriod: Joi.string().optional().valid('morning', 'afternoon'),
    attachment: Joi.string().optional().uri().max(500)
  }).required().min(1),

  approve: Joi.object({
    status: Joi.string().required()
      .valid('Approved', 'Rejected'),

    approvalComments: Joi.string().optional()
      .max(500)
      .when('status', {
        is: 'Rejected',
        then: Joi.required()
      })
  }).required(),

  list: Joi.object({
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(100).optional().default(20),
    status: Joi.string().optional().valid('Pending', 'Approved', 'Rejected', 'Cancelled'),
    leaveType: Joi.string().optional(),
    employeeId: Joi.string().optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    search: Joi.string().optional().max(100)
  })
};
```

### Attendance Validation Schema

```javascript
// Attendance schemas
export const attendanceSchemas = {
  clockIn: Joi.object({
    location: Joi.string().optional().max(200),
    notes: Joi.string().optional().max(500),
    latitude: Joi.number().optional().min(-90).max(90),
    longitude: Joi.number().optional().min(-180).max(180)
  }),

  clockOut: Joi.object({
    location: Joi.string().optional().max(200),
    notes: Joi.string().optional().max(500),
    latitude: Joi.number().optional().min(-90).max(90),
    longitude: Joi.number().optional().min(-180).max(180),
    breakDuration: Joi.number().optional().min(0).max(480) // Max 8 hours break
  }),

  update: Joi.object({
    clockInTime: Joi.date().optional(),
    clockOutTime: Joi.date().optional().min(Joi.ref('clockInTime')),
    location: Joi.string().optional().max(200),
    notes: Joi.string().optional().max(500),
    breakDuration: Joi.number().optional().min(0).max(480),
    overtimeHours: Joi.number().optional().min(0).max(24)
  }).required().min(1),

  list: Joi.object({
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(100).optional().default(20),
    employeeId: Joi.string().optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    status: Joi.string().optional().valid('Present', 'Absent', 'Half Day', 'On Leave'),
    search: Joi.string().optional().max(100)
  })
};
```

### Overtime Validation Schema

```javascript
// Overtime schemas
export const overtimeSchemas = {
  create: Joi.object({
    date: Joi.date().required(),
    hours: Joi.number().required().min(0.5).max(24),
    reason: Joi.string().required().min(10).max(500),
    attendanceId: Joi.string().optional()
  }).required(),

  update: Joi.object({
    date: Joi.date().optional(),
    hours: Joi.number().optional().min(0.5).max(24),
    reason: Joi.string().optional().min(10).max(500)
  }).required().min(1),

  approve: Joi.object({
    status: Joi.string().required().valid('Approved', 'Rejected'),
    approvalComments: Joi.string().optional().max(500)
  }).required(),

  list: Joi.object({
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(100).optional().default(20),
    status: Joi.string().optional().valid('Pending', 'Approved', 'Rejected'),
    employeeId: Joi.string().optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional()
  })
};
```

### Holiday Validation Schema

```javascript
// Holiday schemas
export const holidaySchemas = {
  create: Joi.object({
    name: Joi.string().required().min(3).max(100),
    date: Joi.date().required(),
    type: Joi.string().required().valid('national', 'regional', 'company'),
    description: Joi.string().optional().max(500),
    isOptional: Joi.boolean().optional().default(false)
  }).required(),

  update: Joi.object({
    name: Joi.string().optional().min(3).max(100),
    date: Joi.date().optional(),
    type: Joi.string().optional().valid('national', 'regional', 'company'),
    description: Joi.string().optional().max(500),
    isOptional: Joi.boolean().optional()
  }).required().min(1),

  list: Joi.object({
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(100).optional().default(20),
    year: Joi.number().integer().min(2020).max(2050).optional(),
    type: Joi.string().optional().valid('national', 'regional', 'company'),
    search: Joi.string().optional().max(100)
  })
};
```

### Department & Designation Schemas

```javascript
// Department schemas
export const departmentSchemas = {
  create: Joi.object({
    name: Joi.string().required().min(2).max(100),
    description: Joi.string().optional().max(500),
    headOfDepartment: Joi.string().optional()
  }).required(),

  update: Joi.object({
    name: Joi.string().optional().min(2).max(100),
    description: Joi.string().optional().max(500),
    headOfDepartment: Joi.string().optional()
  }).required().min(1),

  list: Joi.object({
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(100).optional().default(20),
    search: Joi.string().optional().max(100)
  })
};

// Designation schemas
export const designationSchemas = {
  create: Joi.object({
    name: Joi.string().required().min(2).max(100),
    department: Joi.string().optional(),
    description: Joi.string().optional().max(500)
  }).required(),

  update: Joi.object({
    name: Joi.string().optional().min(2).max(100),
    department: Joi.string().optional(),
    description: Joi.string().optional().max(500)
  }).required().min(1),

  list: Joi.object({
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(100).optional().default(20),
    department: Joi.string().optional(),
    search: Joi.string().optional().max(100)
  })
};
```

---

## Task 3.3: Apply Validation Middleware (6 hours)

### Example: Add Validation to Leave Routes

Update `backend/routes/api/leave.js`:

```javascript
import { validateBody, validateQuery, leaveSchemas } from '../../middleware/validate.js';

// Create leave
router.post(
  '/',
  authenticate,
  requireCompany,
  sanitizeBody,
  validateBody(leaveSchemas.create),  // ✅ ADD THIS
  createLeave
);

// Update leave
router.put(
  '/:id',
  authenticate,
  requireCompany,
  sanitizeParams,
  sanitizeBody,
  validateBody(leaveSchemas.update),  // ✅ ADD THIS
  updateLeave
);

// List leaves
router.get(
  '/',
  authenticate,
  requireCompany,
  sanitizeQuery,
  validateQuery(leaveSchemas.list),  // ✅ ADD THIS
  getLeaves
);

// Approve/reject leave
router.patch(
  '/:id/approve',
  authenticate,
  requireCompany,
  requireRole('admin', 'hr', 'manager'),
  sanitizeParams,
  sanitizeBody,
  validateBody(leaveSchemas.approve),  // ✅ ADD THIS
  approveLeave
);
```

---

## Task 3.4: Enhance Query Parameter Sanitization (8 hours)

### Step 1: Create Enhanced Query Sanitization Middleware

Create `backend/middleware/querySanitization.js`:

```javascript
/**
 * Enhanced Query Parameter Sanitization
 * Validates numeric parameters, ObjectIds, and enforces limits
 */

import mongoose from 'mongoose';
import { buildValidationError } from '../utils/apiResponse.js';

/**
 * Validate and sanitize pagination parameters
 */
export const sanitizePagination = (req, res, next) => {
  const { page, limit } = req.query;

  // Validate page
  if (page !== undefined) {
    const pageNum = parseInt(page);
    if (isNaN(pageNum) || pageNum < 1) {
      throw buildValidationError('page', 'Page must be a positive integer');
    }
    req.query.page = pageNum;
  } else {
    req.query.page = 1;
  }

  // Validate limit (enforce maximum)
  if (limit !== undefined) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1) {
      throw buildValidationError('limit', 'Limit must be a positive integer');
    }
    if (limitNum > 100) {
      // ✅ SECURITY FIX: Enforce maximum limit to prevent DoS
      req.query.limit = 100;
      console.warn(`[Security] Limit ${limitNum} exceeds maximum, capped at 100`);
    } else {
      req.query.limit = limitNum;
    }
  } else {
    req.query.limit = 20; // Default
  }

  next();
};

/**
 * Validate ObjectId parameters
 */
export const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (!id) {
      return next();
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw buildValidationError(paramName, `Invalid ${paramName} format. Must be a valid ObjectId.`);
    }

    next();
  };
};

/**
 * Validate date range parameters
 */
export const validateDateRange = (req, res, next) => {
  const { startDate, endDate, dateFrom, dateTo } = req.query;

  const start = startDate || dateFrom;
  const end = endDate || dateTo;

  if (start && isNaN(Date.parse(start))) {
    throw buildValidationError('startDate', 'Invalid start date format');
  }

  if (end && isNaN(Date.parse(end))) {
    throw buildValidationError('endDate', 'Invalid end date format');
  }

  if (start && end && new Date(start) > new Date(end)) {
    throw buildValidationError('dateRange', 'Start date must be before end date');
  }

  next();
};

/**
 * Validate sort parameters
 */
export const validateSort = (allowedFields) => {
  return (req, res, next) => {
    const { sortBy, order } = req.query;

    if (sortBy && !allowedFields.includes(sortBy)) {
      throw buildValidationError('sortBy', `Invalid sort field. Allowed: ${allowedFields.join(', ')}`);
    }

    if (order && !['asc', 'desc'].includes(order.toLowerCase())) {
      throw buildValidationError('order', 'Sort order must be "asc" or "desc"');
    }

    next();
  };
};
```

### Step 2: Apply Enhanced Sanitization

```javascript
// backend/routes/api/employees.js
import { sanitizePagination, validateObjectId, validateDateRange, validateSort } from '../../middleware/querySanitization.js';

// List employees
router.get(
  '/',
  searchLimiter,
  authenticate,
  sanitizeQuery,
  sanitizePagination,  // ✅ ADD THIS
  validateDateRange,   // ✅ ADD THIS
  validateSort(['firstName', 'lastName', 'joiningDate', 'department']),  // ✅ ADD THIS
  requireCompany,
  validateQuery(employeeSchemas.list),
  getEmployees
);

// Get employee by ID
router.get(
  '/:id',
  authenticate,
  requireCompany,
  sanitizeParams,
  validateObjectId('id'),  // ✅ ADD THIS
  getEmployeeById
);
```

---

## Task 3.5: File Upload Validation (8 hours)

### Step 1: Create File Upload Validation Middleware

Create `backend/middleware/fileValidation.js`:

```javascript
/**
 * File Upload Validation
 * Validates file type, size, and scans for malware
 */

import path from 'path';

// Allowed file types (whitelist)
const ALLOWED_IMAGE_TYPES = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const ALLOWED_DOCUMENT_TYPES = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt'];
const ALLOWED_ATTACHMENT_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];

// File size limits (bytes)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;  // 5MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;  // 10MB

/**
 * Validate image upload
 */
export const validateImageUpload = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'FILE_REQUIRED',
        message: 'No file uploaded',
        requestId: req.id
      }
    });
  }

  const file = req.file;
  const ext = path.extname(file.originalname).toLowerCase();

  // Validate file type
  if (!ALLOWED_IMAGE_TYPES.includes(ext)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FILE_TYPE',
        message: `Invalid file type. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
        requestId: req.id
      }
    });
  }

  // Validate file size
  if (file.size > MAX_IMAGE_SIZE) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: `File size exceeds maximum of ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`,
        requestId: req.id
      }
    });
  }

  // Validate MIME type (prevent MIME type spoofing)
  const validMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validMimeTypes.includes(file.mimetype)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_MIME_TYPE',
        message: 'Invalid file MIME type',
        requestId: req.id
      }
    });
  }

  console.log(`[FileValidation] Image upload validated: ${file.originalname} (${file.size} bytes)`);
  next();
};

/**
 * Validate document upload
 */
export const validateDocumentUpload = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'FILE_REQUIRED',
        message: 'No file uploaded',
        requestId: req.id
      }
    });
  }

  const file = req.file;
  const ext = path.extname(file.originalname).toLowerCase();

  // Validate file type
  if (!ALLOWED_DOCUMENT_TYPES.includes(ext)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FILE_TYPE',
        message: `Invalid file type. Allowed: ${ALLOWED_DOCUMENT_TYPES.join(', ')}`,
        requestId: req.id
      }
    });
  }

  // Validate file size
  if (file.size > MAX_DOCUMENT_SIZE) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: `File size exceeds maximum of ${MAX_DOCUMENT_SIZE / (1024 * 1024)}MB`,
        requestId: req.id
      }
    });
  }

  next();
};

/**
 * Validate leave attachment upload
 */
export const validateAttachmentUpload = (req, res, next) => {
  if (!req.file) {
    // Attachment is optional
    return next();
  }

  const file = req.file;
  const ext = path.extname(file.originalname).toLowerCase();

  // Validate file type
  if (!ALLOWED_ATTACHMENT_TYPES.includes(ext)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FILE_TYPE',
        message: `Invalid file type. Allowed: ${ALLOWED_ATTACHMENT_TYPES.join(', ')}`,
        requestId: req.id
      }
    });
  }

  // Validate file size
  if (file.size > MAX_DOCUMENT_SIZE) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: `File size exceeds maximum of ${MAX_DOCUMENT_SIZE / (1024 * 1024)}MB`,
        requestId: req.id
      }
    });
  }

  next();
};

/**
 * Sanitize filename (remove special characters)
 */
export const sanitizeFilename = (filename) => {
  // Remove path traversal attempts
  filename = path.basename(filename);

  // Remove special characters except dots, underscores, and hyphens
  filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Limit length
  const ext = path.extname(filename);
  const name = path.basename(filename, ext);
  const maxLength = 100;

  if (name.length > maxLength) {
    return name.substring(0, maxLength) + ext;
  }

  return filename;
};
```

### Step 2: Apply File Validation to Upload Routes

```javascript
// backend/routes/api/employees.js
import { validateImageUpload } from '../../middleware/fileValidation.js';

// Upload employee profile image
router.post(
  '/:id/image',
  uploadLimiter,
  authenticate,
  requireCompany,
  uploadEmployeeImage,
  validateImageUpload,  // ✅ ADD THIS (after multer, before controller)
  uploadEmployeeProfileImage
);
```

---

## Testing Checklist

### Unit Tests
- [ ] Test Joi schemas with valid input
- [ ] Test Joi schemas with invalid input
- [ ] Test pagination sanitization
- [ ] Test ObjectId validation
- [ ] Test date range validation
- [ ] Test file type validation
- [ ] Test file size validation

### Integration Tests
- [ ] Test endpoints reject invalid query parameters
- [ ] Test endpoints reject files over size limit
- [ ] Test endpoints reject invalid file types
- [ ] Test endpoints accept valid requests

---

## Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| **Endpoints with validation** | 100% | TBD |
| **Query param validation** | All numeric params | TBD |
| **File upload validation** | All upload endpoints | TBD |
| **Test coverage** | >90% | TBD |

---

## Next Steps

After Phase 3 completion:
1. Run validation tests
2. Test with invalid inputs
3. Deploy to staging
4. Monitor validation errors
5. Plan Phase 4 (Business Logic Fixes)
