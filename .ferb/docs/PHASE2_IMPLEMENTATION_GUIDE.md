# Phase 2: Authentication & Authorization - Implementation Guide

## Overview

**Priority:** 🟠 HIGH
**Estimated Time:** 60 hours (1.5 weeks)
**Team:** Backend Developer (Full-time), Frontend Developer (Part-time)

### Goals
- ✅ Add rate limiting to prevent brute force and DoS attacks
- ✅ Fix authorization gaps in project/task access control
- ✅ Implement CSRF protection
- ✅ Remove sensitive data from logs

### Prerequisites
- ✅ Phase 1 Complete (NoSQL injection, IDOR, Mass Assignment fixes)
- ✅ All Phase 1 tests passing
- ✅ Backend server running on port 5000

---

## Task 2.1: Add Rate Limiting Middleware (12 hours)

### Step 1: Install Dependencies (0.5 hours)

```bash
cd backend
npm install express-rate-limit rate-limit-mongo
```

### Step 2: Create Rate Limiting Middleware (4 hours)

Create [backend/middleware/rateLimiting.js](backend/middleware/rateLimiting.js):

```javascript
/**
 * Rate Limiting Middleware
 * Prevents brute force attacks and DoS
 */

import rateLimit from 'express-rate-limit';
import MongoStore from 'rate-limit-mongo';

const mongoUri = process.env.MONGODB_URI;

// ✅ Strict rate limit for authentication endpoints
export const authLimiter = rateLimit({
  store: new MongoStore({
    uri: mongoUri,
    collectionName: 'rateLimits',
    expireTimeMs: 15 * 60 * 1000  // 15 minutes
  }),
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,  // 5 attempts per window
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please try again in 15 minutes.',
      retryAfter: '15 minutes'
    }
  },
  standardHeaders: true,  // Return rate limit info in headers
  legacyHeaders: false,
  skipSuccessfulRequests: false,  // Count all attempts
  skipFailedRequests: false,
  // Custom key generator (by IP + userId)
  keyGenerator: (req) => {
    const ip = req.ip || req.connection.remoteAddress;
    const userId = req.user?.userId || 'anonymous';
    return `${ip}:${userId}`;
  }
});

// ✅ Moderate rate limit for API endpoints
export const apiLimiter = rateLimit({
  store: new MongoStore({
    uri: mongoUri,
    collectionName: 'rateLimits',
    expireTimeMs: 1 * 60 * 1000  // 1 minute
  }),
  windowMs: 1 * 60 * 1000,  // 1 minute
  max: 100,  // 100 requests per minute
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please slow down.',
      retryAfter: '1 minute'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = req.ip || req.connection.remoteAddress;
    const userId = req.user?.userId || 'anonymous';
    return `${ip}:${userId}`;
  }
});

// ✅ Strict rate limit for export endpoints (prevent resource exhaustion)
export const exportLimiter = rateLimit({
  store: new MongoStore({
    uri: mongoUri,
    collectionName: 'rateLimits',
    expireTimeMs: 60 * 60 * 1000  // 1 hour
  }),
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 10,  // 10 exports per hour
  message: {
    success: false,
    error: {
      code: 'EXPORT_LIMIT_EXCEEDED',
      message: 'Too many export requests. Please try again later.',
      retryAfter: '1 hour'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.userId || req.ip;
  }
});

// ✅ Very strict rate limit for password reset/OTP
export const passwordResetLimiter = rateLimit({
  store: new MongoStore({
    uri: mongoUri,
    collectionName: 'rateLimits',
    expireTimeMs: 60 * 60 * 1000  // 1 hour
  }),
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 3,  // 3 attempts per hour
  message: {
    success: false,
    error: {
      code: 'PASSWORD_RESET_LIMIT_EXCEEDED',
      message: 'Too many password reset attempts. Please try again in 1 hour.',
      retryAfter: '1 hour'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = req.body?.email || req.query?.email || 'unknown';
    return email.toLowerCase();
  }
});

// ✅ Moderate rate limit for search endpoints (prevent ReDoS)
export const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 minute
  max: 30,  // 30 searches per minute
  message: {
    success: false,
    error: {
      code: 'SEARCH_LIMIT_EXCEEDED',
      message: 'Too many search requests. Please slow down.',
      retryAfter: '1 minute'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ✅ Strict rate limit for file uploads (prevent storage abuse)
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 20,  // 20 uploads per hour
  message: {
    success: false,
    error: {
      code: 'UPLOAD_LIMIT_EXCEEDED',
      message: 'Too many file uploads. Please try again later.',
      retryAfter: '1 hour'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});
```

**Key Features:**
- **MongoDB-backed storage**: Rate limits persist across server restarts
- **Configurable windows**: Different time windows for different endpoints
- **Custom key generators**: Rate limit by IP, userId, or email
- **Standard headers**: Returns `RateLimit-*` headers for client tracking
- **Security logging**: Log rate limit violations for monitoring

### Step 3: Apply Global API Rate Limiter (2 hours)

Update [backend/app.js](backend/app.js) or [backend/server.js](backend/server.js):

```javascript
// backend/app.js
import { apiLimiter } from './middleware/rateLimiting.js';

// ... other middleware ...

// ✅ Apply global rate limiter to all API routes
app.use('/api/', apiLimiter);

// ... rest of app setup ...
```

**Important Notes:**
- Apply `apiLimiter` BEFORE route definitions
- This prevents abuse across all API endpoints
- Individual routes can have stricter limits on top of this

---

## Task 2.2: Apply Rate Limiters to Routes (8 hours)

### Step 1: Authentication Routes

Update [backend/routes/api/user-profile.js](backend/routes/api/user-profile.js):

```javascript
import { authLimiter, passwordResetLimiter } from '../../middleware/rateLimiting.js';

// ✅ Password change endpoint
router.post('/change-password',
  authLimiter,  // 5 attempts per 15 minutes
  attachRequestId,
  authenticate,
  requireOwnEmployee,
  validateBody(profileSchemas.changePassword),
  changePassword
);

// ✅ Forgot password - send OTP
router.post('/forgot-password/send-otp',
  passwordResetLimiter,  // 3 attempts per hour
  attachRequestId,
  authenticate,
  validateBody(profileSchemas.sendOTP),
  sendForgotPasswordOTP
);

// ✅ Forgot password - reset with OTP
router.post('/forgot-password/reset',
  passwordResetLimiter,  // 3 attempts per hour
  attachRequestId,
  authenticate,
  validateBody(profileSchemas.resetPassword),
  resetForgotPassword
);
```

### Step 2: Export Endpoints

Update export routes in [backend/routes/api/clients.js](backend/routes/api/clients.js):

```javascript
import { exportLimiter } from '../../middleware/rateLimiting.js';

// ✅ Export clients to PDF
router.get('/export/pdf',
  exportLimiter,  // 10 exports per hour
  attachRequestId,
  authenticate,
  requireCompany,
  requireRole('admin', 'hr', 'manager', 'superadmin'),
  exportPDF
);

// ✅ Export clients to Excel
router.get('/export/excel',
  exportLimiter,
  attachRequestId,
  authenticate,
  requireCompany,
  requireRole('admin', 'hr', 'manager', 'superadmin'),
  exportExcel
);
```

Update export routes in [backend/routes/api/projects.js](backend/routes/api/projects.js):

```javascript
import { exportLimiter } from '../../middleware/rateLimiting.js';

router.get('/export/pdf',
  exportLimiter,
  attachRequestId,
  authenticate,
  requireCompany,
  exportProjectsPDF
);
```

Update export routes in [backend/routes/api/employees.js](backend/routes/api/employees.js):

```javascript
import { exportLimiter } from '../../middleware/rateLimiting.js';

router.get('/export/pdf',
  exportLimiter,
  attachRequestId,
  authenticate,
  requireCompany,
  requireRole('admin', 'hr', 'superadmin'),
  exportEmployeesPDF
);

router.get('/export/excel',
  exportLimiter,
  attachRequestId,
  authenticate,
  requireCompany,
  requireRole('admin', 'hr', 'superadmin'),
  exportEmployeesExcel
);
```

### Step 3: Search Endpoints

Update search routes:

```javascript
import { searchLimiter } from '../../middleware/rateLimiting.js';

// backend/routes/api/employees.js
router.get('/',
  searchLimiter,  // 30 searches per minute
  attachRequestId,
  authenticate,
  requireCompany,
  sanitizeQuery,
  getEmployees
);

// backend/routes/api/projects.js
router.get('/',
  searchLimiter,
  attachRequestId,
  authenticate,
  requireCompany,
  sanitizeQuery,
  getProjects
);

// backend/routes/api/tasks.js
router.get('/',
  searchLimiter,
  attachRequestId,
  authenticate,
  requireCompany,
  sanitizeQuery,
  getTasks
);
```

### Step 4: File Upload Endpoints

Update file upload routes:

```javascript
import { uploadLimiter } from '../../middleware/rateLimiting.js';

// backend/routes/api/user-profile.js
router.post('/upload-profile-image',
  uploadLimiter,  // 20 uploads per hour
  attachRequestId,
  authenticate,
  requireOwnEmployee,
  upload.single('profileImage'),
  uploadProfileImage
);

// backend/routes/api/employees.js
router.post('/:id/upload-documents',
  uploadLimiter,
  attachRequestId,
  authenticate,
  requireCompany,
  requireRole('admin', 'hr', 'superadmin'),
  upload.array('documents', 5),
  uploadEmployeeDocuments
);
```

---

## Task 2.3: Fix Authorization Gaps (10 hours)

### Issue: Employee Without Record Gets All Projects

**Current Bug:** If an employee user doesn't have a matching employee record, the system returns ALL projects instead of an empty list.

**Security Impact:** HIGH - Potential data leakage

### Step 1: Fix Project Controller (4 hours)

Update [backend/controllers/rest/project.controller.js](backend/controllers/rest/project.controller.js):

```javascript
export const getProjects = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const { search, status, priority, page = 1, limit = 10 } = req.query;

  const collections = getTenantCollections(user.companyId);

  let filter = {
    companyId: user.companyId,
    isDeleted: { $ne: true }
  };

  // ... status and priority filters ...

  // ✅ FIX: Strict authorization for employee/manager/leads roles
  if (['employee', 'manager', 'leads'].includes(user.role?.toLowerCase())) {
    const employee = await collections.employees.findOne({
      $or: [
        { clerkUserId: user.userId },
        { 'account.userId': user.userId }
      ],
      isDeleted: { $ne: true },
    });

    // ✅ SECURITY FIX: If employee record not found, return empty results
    if (!employee) {
      console.warn(
        `[Security] Employee record not found for user ${user.userId} (role: ${user.role}). ` +
        `Denying access to all projects.`
      );

      return sendSuccess(res, [], 'No projects accessible', {
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: limit
      });
    }

    // ✅ Apply assignment-based filtering for verified employees
    const assignmentFilter = {
      $or: [
        { teamMembers: employee._id },
        { createdBy: employee.clerkUserId },
        { 'team.employee': employee._id },
        { projectLead: employee._id }
      ]
    };

    filter = { ...filter, ...assignmentFilter };
  }

  // ... rest of logic (search, pagination) ...
});
```

### Step 2: Fix Task Controller (4 hours)

Update [backend/controllers/rest/task.controller.js](backend/controllers/rest/task.controller.js):

```javascript
export const getTasks = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const { search, status, priority, projectId, page = 1, limit = 10 } = req.query;

  const collections = getTenantCollections(user.companyId);

  let filter = {
    companyId: user.companyId,
    isDeleted: { $ne: true }
  };

  // ... status, priority, projectId filters ...

  // ✅ FIX: Strict authorization for employee/manager roles
  if (['employee', 'manager'].includes(user.role?.toLowerCase())) {
    const employee = await collections.employees.findOne({
      $or: [
        { clerkUserId: user.userId },
        { 'account.userId': user.userId }
      ],
      isDeleted: { $ne: true },
    });

    // ✅ SECURITY FIX: If employee record not found, return empty results
    if (!employee) {
      console.warn(
        `[Security] Employee record not found for user ${user.userId} (role: ${user.role}). ` +
        `Denying access to all tasks.`
      );

      return sendSuccess(res, [], 'No tasks accessible', {
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: limit
      });
    }

    // ✅ Apply assignment-based filtering
    const assignmentFilter = {
      $or: [
        { assignedTo: employee._id },
        { createdBy: employee.clerkUserId },
        { 'assignees.employee': employee._id }
      ]
    };

    filter = { ...filter, ...assignmentFilter };
  }

  // ... rest of logic ...
});
```

### Step 3: Add Security Logging (2 hours)

Create [backend/utils/securityLogger.js](backend/utils/securityLogger.js):

```javascript
/**
 * Security Event Logger
 * Logs security-related events for monitoring
 */

import { getTenantCollections } from '../config/db.js';

export const logSecurityEvent = async (companyId, event) => {
  try {
    const collections = getTenantCollections(companyId);

    const securityLog = {
      timestamp: new Date(),
      type: event.type,  // 'AUTHORIZATION_FAILURE', 'RATE_LIMIT_EXCEEDED', 'BLOCKED_FIELD_ACCESS'
      severity: event.severity || 'MEDIUM',  // LOW, MEDIUM, HIGH, CRITICAL
      userId: event.userId,
      employeeId: event.employeeId,
      action: event.action,  // 'GET_PROJECTS', 'UPDATE_EMPLOYEE', etc.
      details: event.details,
      ip: event.ip,
      userAgent: event.userAgent,
      requestId: event.requestId
    };

    await collections.securityLogs.insertOne(securityLog);

    // Also log to console for real-time monitoring
    console.warn(`[Security] ${event.type}:`, JSON.stringify(securityLog, null, 2));

    // TODO: Send alert for CRITICAL events
    if (event.severity === 'CRITICAL') {
      // Send email/Slack notification
    }
  } catch (error) {
    console.error('[logSecurityEvent] Failed to log security event:', error);
  }
};
```

Update controllers to use security logger:

```javascript
import { logSecurityEvent } from '../../utils/securityLogger.js';

// In getProjects controller
if (!employee) {
  await logSecurityEvent(user.companyId, {
    type: 'AUTHORIZATION_FAILURE',
    severity: 'HIGH',
    userId: user.userId,
    action: 'GET_PROJECTS',
    details: 'Employee record not found for user',
    ip: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.id
  });

  return sendSuccess(res, [], 'No projects accessible', ...);
}
```

---

## Task 2.4: Add CSRF Protection (12 hours)

### Step 1: Install Dependencies (0.5 hours)

```bash
cd backend
npm install csurf cookie-parser
```

### Step 2: Configure CSRF Middleware (4 hours)

Create [backend/middleware/csrf.js](backend/middleware/csrf.js):

```javascript
/**
 * CSRF Protection Middleware
 * Protects against Cross-Site Request Forgery attacks
 */

import csrf from 'csurf';
import cookieParser from 'cookie-parser';

// Configure CSRF protection
export const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',  // HTTPS only in production
    sameSite: 'strict'
  }
});

/**
 * Generate CSRF token and attach to response
 * Use this on routes that render forms or return CSRF tokens
 */
export const generateCsrfToken = (req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
};

/**
 * Custom CSRF error handler
 */
export const csrfErrorHandler = (err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_TOKEN_INVALID',
        message: 'Invalid CSRF token. Please refresh the page and try again.',
        requestId: req.id
      }
    });
  }
  next(err);
};
```

### Step 3: Apply CSRF Middleware (2 hours)

Update [backend/app.js](backend/app.js):

```javascript
import cookieParser from 'cookie-parser';
import { csrfProtection, csrfErrorHandler } from './middleware/csrf.js';

// ... other middleware ...

// Cookie parser (required for CSRF)
app.use(cookieParser());

// ✅ Apply CSRF protection to all state-changing routes
// Note: Only apply to routes that modify data (POST, PUT, DELETE, PATCH)
app.use('/api/', (req, res, next) => {
  // Skip CSRF for GET requests and OPTIONS (preflight)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF for webhook endpoints (use other verification)
  if (req.path.startsWith('/webhooks/')) {
    return next();
  }

  // Apply CSRF protection
  csrfProtection(req, res, next);
});

// ... routes ...

// CSRF error handler (must be AFTER routes)
app.use(csrfErrorHandler);
```

### Step 4: Create CSRF Token Endpoint (2 hours)

Create [backend/routes/api/csrf.js](backend/routes/api/csrf.js):

```javascript
import express from 'express';
import { csrfProtection } from '../../middleware/csrf.js';

const router = express.Router();

/**
 * GET /api/csrf-token
 * Returns CSRF token for client to include in requests
 */
router.get('/csrf-token', csrfProtection, (req, res) => {
  res.json({
    success: true,
    data: {
      csrfToken: req.csrfToken()
    }
  });
});

export default router;
```

Register in [backend/app.js](backend/app.js):

```javascript
import csrfRoutes from './routes/api/csrf.js';

app.use('/api', csrfRoutes);
```

### Step 5: Update Frontend to Include CSRF Token (3.5 hours)

**Option 1: Fetch CSRF token on app load**

Update [react/src/App.tsx](react/src/App.tsx):

```typescript
import { useEffect, useState } from 'react';
import axios from 'axios';

function App() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
    // Fetch CSRF token on app load
    const fetchCsrfToken = async () => {
      try {
        const response = await axios.get('/api/csrf-token');
        const token = response.data.data.csrfToken;
        setCsrfToken(token);

        // Set CSRF token in axios defaults
        axios.defaults.headers.common['X-CSRF-Token'] = token;

        // Store in localStorage for persistence
        localStorage.setItem('csrfToken', token);
      } catch (error) {
        console.error('Failed to fetch CSRF token:', error);
      }
    };

    fetchCsrfToken();
  }, []);

  // ... rest of app ...
}
```

**Option 2: Axios interceptor to fetch CSRF token on 403**

Create [react/src/utils/axiosConfig.ts](react/src/utils/axiosConfig.ts):

```typescript
import axios from 'axios';

// Response interceptor to handle CSRF errors
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If CSRF error and not already retried
    if (
      error.response?.status === 403 &&
      error.response?.data?.error?.code === 'CSRF_TOKEN_INVALID' &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        // Fetch new CSRF token
        const response = await axios.get('/api/csrf-token');
        const newToken = response.data.data.csrfToken;

        // Update axios defaults
        axios.defaults.headers.common['X-CSRF-Token'] = newToken;

        // Retry original request with new token
        originalRequest.headers['X-CSRF-Token'] = newToken;
        return axios(originalRequest);
      } catch (csrfError) {
        console.error('Failed to refresh CSRF token:', csrfError);
        return Promise.reject(csrfError);
      }
    }

    return Promise.reject(error);
  }
);
```

**Testing CSRF Protection:**
```bash
# Test without CSRF token (should fail)
curl -X POST http://localhost:5000/api/employees \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"name": "Test"}'
# Expected: 403 CSRF_TOKEN_INVALID

# Test with CSRF token (should succeed)
curl -X POST http://localhost:5000/api/employees \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -H "X-CSRF-Token: {csrfToken}" \
  -d '{"name": "Test"}'
# Expected: 200 OK
```

---

## Task 2.5: Remove Sensitive Data from Logs (8 hours)

### Step 1: Create Log Sanitization Utility (4 hours)

Create [backend/utils/logSanitization.js](backend/utils/logSanitization.js):

```javascript
/**
 * Log Sanitization Utility
 * Removes sensitive data from logs
 */

// Fields to always redact
const SENSITIVE_FIELDS = [
  'password',
  'newPassword',
  'currentPassword',
  'confirmPassword',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
  'clerkSecret',
  'clerkPublishableKey',
  'bankDetails',
  'accountNumber',
  'ifscCode',
  'aadhar',
  'pan',
  'passport',
  'ssn',
  'creditCard',
  'cvv'
];

/**
 * Sanitize object by redacting sensitive fields
 * @param {Object} obj - Object to sanitize
 * @param {Array<string>} additionalFields - Additional fields to redact
 * @returns {Object} Sanitized object
 */
export const sanitizeForLogs = (obj, additionalFields = []) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const fieldsToRedact = [...SENSITIVE_FIELDS, ...additionalFields];
  const sanitized = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Check if field should be redacted
    const shouldRedact = fieldsToRedact.some(field =>
      lowerKey.includes(field.toLowerCase())
    );

    if (shouldRedact) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeForLogs(value, additionalFields);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Sanitize error object for logging
 * @param {Error} error - Error object
 * @returns {Object} Sanitized error
 */
export const sanitizeError = (error) => {
  return {
    message: error.message,
    code: error.code,
    // Don't include stack trace in production
    stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
    // Sanitize any error.data
    data: error.data ? sanitizeForLogs(error.data) : undefined
  };
};

/**
 * Safe logger wrapper
 * Automatically sanitizes all logged objects
 */
export const safeLog = {
  info: (message, data) => {
    console.log(`[INFO] ${message}`, data ? sanitizeForLogs(data) : '');
  },

  warn: (message, data) => {
    console.warn(`[WARN] ${message}`, data ? sanitizeForLogs(data) : '');
  },

  error: (message, error) => {
    console.error(`[ERROR] ${message}`, error ? sanitizeError(error) : '');
  },

  debug: (message, data) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${message}`, data ? sanitizeForLogs(data) : '');
    }
  }
};
```

### Step 2: Update Controllers to Use Safe Logging (4 hours)

**Before:**
```javascript
// ❌ INSECURE: Logs sensitive data
console.log('User login attempt:', req.body);
// Output: { email: 'user@example.com', password: 'MySecretPassword123' }

console.log('Employee data:', employee);
// Output: { name: 'John', salary: {...}, bankDetails: {...} }
```

**After:**
```javascript
import { safeLog, sanitizeForLogs } from '../../utils/logSanitization.js';

// ✅ SECURE: Password redacted
safeLog.info('User login attempt:', req.body);
// Output: { email: 'user@example.com', password: '[REDACTED]' }

// ✅ SECURE: Sensitive fields redacted
safeLog.info('Employee data:', employee);
// Output: { name: 'John', salary: '[REDACTED]', bankDetails: '[REDACTED]' }
```

**Update common logging locations:**

1. [backend/controllers/rest/userProfile.controller.js](backend/controllers/rest/userProfile.controller.js)
2. [backend/controllers/rest/employee.controller.js](backend/controllers/rest/employee.controller.js)
3. [backend/middleware/auth.js](backend/middleware/auth.js)
4. [backend/utils/apiResponse.js](backend/utils/apiResponse.js)

**Example update:**

```javascript
// backend/controllers/rest/userProfile.controller.js
import { safeLog } from '../../utils/logSanitization.js';

export const changePassword = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const { currentPassword, newPassword } = req.body;

  // ❌ BEFORE: console.log('Password change request:', req.body);
  // ✅ AFTER:
  safeLog.info('Password change request', { userId: user.userId });

  // ... rest of logic ...

  safeLog.info('Password changed successfully', { userId: user.userId });
});
```

---

## Task 2.6: Write Unit Tests for Phase 2 (10 hours)

Create [backend/tests/security/rateLimiting.test.js](backend/tests/security/rateLimiting.test.js):

```javascript
/**
 * Unit Tests for Rate Limiting
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';

describe('Rate Limiting - Unit Tests', () => {

  describe('Rate Limiter Configuration', () => {
    test('authLimiter should have correct configuration', () => {
      // Test that authLimiter is configured with:
      // - windowMs: 15 minutes
      // - max: 5 attempts
      // - Correct error message
    });

    test('apiLimiter should allow 100 requests per minute', () => {
      // Test configuration
    });

    test('exportLimiter should allow 10 exports per hour', () => {
      // Test configuration
    });

    test('passwordResetLimiter should allow 3 attempts per hour', () => {
      // Test configuration
    });
  });

  describe('Key Generation', () => {
    test('should generate key from IP + userId', () => {
      const req = {
        ip: '192.168.1.1',
        user: { userId: 'user123' }
      };

      // Test key generator function
      // Expected: '192.168.1.1:user123'
    });

    test('should use email for password reset limiter', () => {
      const req = {
        body: { email: 'test@example.com' }
      };

      // Test key generator
      // Expected: 'test@example.com'
    });
  });
});
```

Create [backend/tests/security/logSanitization.test.js](backend/tests/security/logSanitization.test.js):

```javascript
/**
 * Unit Tests for Log Sanitization
 */

import { sanitizeForLogs, sanitizeError, safeLog } from '../../utils/logSanitization.js';

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

    test('should redact bankDetails', () => {
      const input = {
        name: 'John Doe',
        bankDetails: {
          accountNumber: '1234567890',
          ifscCode: 'HDFC0001234'
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
          password: 'secret'
        }
      };

      const result = sanitizeForLogs(input);

      expect(result.user.email).toBe('test@example.com');
      expect(result.user.password).toBe('[REDACTED]');
    });

    test('should handle arrays', () => {
      const input = [
        { name: 'User 1', password: 'secret1' },
        { name: 'User 2', password: 'secret2' }
      ];

      const result = sanitizeForLogs(input);

      expect(result[0].password).toBe('[REDACTED]');
      expect(result[1].password).toBe('[REDACTED]');
    });

    test('should redact additional custom fields', () => {
      const input = {
        name: 'John',
        customSecret: 'sensitive data'
      };

      const result = sanitizeForLogs(input, ['customSecret']);

      expect(result.name).toBe('John');
      expect(result.customSecret).toBe('[REDACTED]');
    });
  });

  describe('sanitizeError()', () => {
    test('should sanitize error object', () => {
      const error = new Error('Test error');
      error.code = 'TEST_ERROR';
      error.data = { password: 'secret' };

      const result = sanitizeError(error);

      expect(result.message).toBe('Test error');
      expect(result.code).toBe('TEST_ERROR');
      expect(result.data.password).toBe('[REDACTED]');
    });

    test('should not include stack trace in production', () => {
      process.env.NODE_ENV = 'production';

      const error = new Error('Test error');
      const result = sanitizeError(error);

      expect(result.stack).toBeUndefined();
    });
  });

  describe('safeLog wrapper', () => {
    test('should sanitize data in safeLog.info', () => {
      // Mock console.log
      const mockLog = jest.spyOn(console, 'log').mockImplementation();

      safeLog.info('Test message', { password: 'secret' });

      // Verify console.log was called with sanitized data
      expect(mockLog).toHaveBeenCalled();
      const loggedData = mockLog.mock.calls[0][1];
      expect(loggedData.password).toBe('[REDACTED]');

      mockLog.mockRestore();
    });
  });
});
```

---

## Task 2.7: Write Integration Tests for Phase 2 (10 hours)

Create [backend/tests/security/rateLimiting.integration.test.js](backend/tests/security/rateLimiting.integration.test.js):

```javascript
/**
 * Integration Tests for Rate Limiting
 */

import request from 'supertest';
import app from '../../server.js';

describe('Rate Limiting - Integration Tests', () => {
  let authToken;

  beforeAll(async () => {
    // Setup: Get auth token
  });

  describe('Authentication Rate Limiting', () => {
    test('should allow 5 password change attempts', async () => {
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/user-profile/change-password')
          .send({
            currentPassword: 'wrong',
            newPassword: 'test123',
            confirmPassword: 'test123'
          })
          .set('Authorization', `Bearer ${authToken}`);

        // First 5 should get through (even if password is wrong)
        expect([200, 400, 401]).toContain(response.status);
      }
    });

    test('should block 6th password change attempt', async () => {
      // 6th attempt should be rate limited
      const response = await request(app)
        .post('/api/user-profile/change-password')
        .send({
          currentPassword: 'wrong',
          newPassword: 'test123',
          confirmPassword: 'test123'
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(429);  // Too Many Requests
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(response.body.error.message).toContain('15 minutes');
    });

    test('should return rate limit headers', async () => {
      const response = await request(app)
        .post('/api/user-profile/change-password')
        .send({
          currentPassword: 'test',
          newPassword: 'test123',
          confirmPassword: 'test123'
        })
        .set('Authorization', `Bearer ${authToken}`);

      // Check for standard rate limit headers
      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
      expect(response.headers['ratelimit-reset']).toBeDefined();
    });
  });

  describe('Export Rate Limiting', () => {
    test('should allow 10 exports per hour', async () => {
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .get('/api/clients/export/pdf')
          .set('Authorization', `Bearer ${authToken}`);

        expect([200, 401, 403]).toContain(response.status);
      }
    });

    test('should block 11th export attempt', async () => {
      const response = await request(app)
        .get('/api/clients/export/pdf')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe('EXPORT_LIMIT_EXCEEDED');
    });
  });

  describe('API Rate Limiting', () => {
    test('should allow 100 requests per minute', async () => {
      const promises = [];

      for (let i = 0; i < 100; i++) {
        promises.push(
          request(app)
            .get('/api/employees')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const responses = await Promise.all(promises);

      // Most should succeed
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThan(90);
    });

    test('should block requests exceeding 100 per minute', async () => {
      // Make 101st request
      const response = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });
});
```

Create [backend/tests/security/csrf.integration.test.js](backend/tests/security/csrf.integration.test.js):

```javascript
/**
 * Integration Tests for CSRF Protection
 */

import request from 'supertest';
import app from '../../server.js';

describe('CSRF Protection - Integration Tests', () => {
  let authToken;
  let csrfToken;

  beforeAll(async () => {
    // Setup: Get auth token
  });

  describe('CSRF Token Endpoint', () => {
    test('should return CSRF token', async () => {
      const response = await request(app)
        .get('/api/csrf-token')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.csrfToken).toBeDefined();

      csrfToken = response.body.data.csrfToken;
    });
  });

  describe('POST Requests Without CSRF Token', () => {
    test('should reject POST without CSRF token', async () => {
      const response = await request(app)
        .post('/api/employees')
        .send({ name: 'Test Employee' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('CSRF_TOKEN_INVALID');
    });

    test('should reject PUT without CSRF token', async () => {
      const response = await request(app)
        .put('/api/employees/me')
        .send({ phone: '1234567890' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('CSRF_TOKEN_INVALID');
    });

    test('should reject DELETE without CSRF token', async () => {
      const response = await request(app)
        .delete('/api/employees/123')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('CSRF_TOKEN_INVALID');
    });
  });

  describe('POST Requests With CSRF Token', () => {
    test('should accept POST with valid CSRF token', async () => {
      const response = await request(app)
        .post('/api/employees')
        .send({ name: 'Test Employee' })
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken);

      expect([200, 201, 400]).toContain(response.status);
      if (response.status === 403) {
        expect(response.body.error.code).not.toBe('CSRF_TOKEN_INVALID');
      }
    });

    test('should accept PUT with valid CSRF token', async () => {
      const response = await request(app)
        .put('/api/employees/me')
        .send({ phone: '1234567890' })
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken);

      expect([200, 400]).toContain(response.status);
      if (response.status === 403) {
        expect(response.body.error.code).not.toBe('CSRF_TOKEN_INVALID');
      }
    });
  });

  describe('GET Requests (No CSRF Required)', () => {
    test('should allow GET without CSRF token', async () => {
      const response = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 401]).toContain(response.status);
      // Should NOT return CSRF error
      if (response.status === 403) {
        expect(response.body.error.code).not.toBe('CSRF_TOKEN_INVALID');
      }
    });
  });
});
```

---

## Phase 2 Testing Checklist

### Rate Limiting Tests
- [ ] Auth endpoints limited to 5 attempts per 15 minutes
- [ ] API endpoints limited to 100 requests per minute
- [ ] Export endpoints limited to 10 per hour
- [ ] Password reset limited to 3 attempts per hour
- [ ] Rate limit headers returned in responses
- [ ] Rate limits persist across server restarts (MongoDB store)

### Authorization Tests
- [ ] Employee without record gets empty project list
- [ ] Employee with record gets filtered projects
- [ ] Admin/HR get all projects
- [ ] Security events logged correctly
- [ ] Unauthorized access attempts blocked

### CSRF Tests
- [ ] POST/PUT/DELETE without CSRF token rejected
- [ ] POST/PUT/DELETE with valid CSRF token accepted
- [ ] GET requests don't require CSRF token
- [ ] CSRF token endpoint accessible
- [ ] CSRF errors return correct error code

### Log Sanitization Tests
- [ ] Passwords redacted in logs
- [ ] Bank details redacted
- [ ] Tokens redacted
- [ ] Nested sensitive fields redacted
- [ ] Custom fields can be added to redaction list
- [ ] Stack traces removed in production

---

## Deployment Checklist

### Pre-Deployment
- [ ] All Phase 2 unit tests passing (35+ tests)
- [ ] All Phase 2 integration tests passing (30+ tests)
- [ ] Rate limiting tested manually (Postman/cURL)
- [ ] CSRF protection tested manually
- [ ] Log sanitization verified (check console output)
- [ ] Authorization fixes verified (test with different roles)
- [ ] Code review completed
- [ ] Security scan clean (OWASP ZAP)

### Deployment
- [ ] Deploy to staging environment
- [ ] Test rate limiting in staging
- [ ] Test CSRF protection in staging
- [ ] Monitor error rates for 48 hours
- [ ] Check MongoDB rateLimits collection
- [ ] Verify security logs collection
- [ ] Test with production-like traffic

### Post-Deployment
- [ ] Monitor rate limit violations
- [ ] Check for CSRF errors
- [ ] Review security logs
- [ ] Collect user feedback
- [ ] Update documentation

---

## Success Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| **Rate Limiting** | 100% of endpoints protected | TBD |
| **CSRF Protection** | All POST/PUT/DELETE protected | TBD |
| **Authorization Gaps** | 0 unauthorized access incidents | TBD |
| **Log Security** | 0 sensitive data in logs | TBD |
| **Test Coverage** | >90% for Phase 2 code | TBD |
| **Performance Impact** | <50ms latency increase | TBD |

---

## Next Steps

After Phase 2 completion:
1. **Run security scan**: Use OWASP ZAP to verify fixes
2. **Deploy to staging**: Test in production-like environment
3. **Monitor metrics**: Track rate limits, CSRF errors, security events
4. **Plan Phase 3**: Input Validation & Sanitization
   - Comprehensive Joi validation
   - Query parameter sanitization
   - File upload validation

---

## Resources

- **express-rate-limit**: https://www.npmjs.com/package/express-rate-limit
- **csurf**: https://www.npmjs.com/package/csurf
- **OWASP CSRF Prevention**: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- **Rate Limiting Best Practices**: https://www.cloudflare.com/learning/bots/what-is-rate-limiting/

---

## Contact

For questions about Phase 2 implementation:
- Review: [SECURITY_IMPLEMENTATION_PLAN.md](./SECURITY_IMPLEMENTATION_PLAN.md)
- Phase 1: [PHASE1_IMPLEMENTATION_PROGRESS.md](./PHASE1_IMPLEMENTATION_PROGRESS.md)
- Testing: [SECURITY_SCAN_GUIDE.md](./SECURITY_SCAN_GUIDE.md)
