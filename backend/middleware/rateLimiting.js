/**
 * Rate Limiting Middleware
 * Prevents brute force attacks and DoS
 *
 * SECURITY FIX - Phase 2, Task 2.1
 * Created: 2026-03-01
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
  standardHeaders: true,  // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,   // Disable X-RateLimit-* headers
  skipSuccessfulRequests: false,  // Count all attempts
  skipFailedRequests: false,
  // Custom key generator (by IP + userId)
  keyGenerator: (req) => {
    const ip = req.ip || req.connection.remoteAddress;
    const userId = req.user?.userId || 'anonymous';
    return `auth:${ip}:${userId}`;
  },
  // Skip rate limiting for specific IPs (e.g., internal health checks)
  skip: (req) => {
    const trustedIPs = process.env.TRUSTED_IPS?.split(',') || [];
    return trustedIPs.includes(req.ip);
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
  max: 300,  // 300 requests per minute (increased from 100 for better UX with multiple modals)
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
    return `api:${ip}:${userId}`;
  },
  skip: (req) => {
    const trustedIPs = process.env.TRUSTED_IPS?.split(',') || [];
    // Also skip rate limiting for read-only lookup endpoints (shifts, batches, departments, designations)
    // These are frequently called by modals and components for dropdowns
    const skipPaths = ['/api/shifts', '/api/batches', '/api/departments', '/api/designations'];
    const shouldSkip = trustedIPs.includes(req.ip) ||
      skipPaths.some(path => (req.path || req.url)?.startsWith(path));
    return shouldSkip;
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
    const userId = req.user?.userId || req.ip;
    return `export:${userId}`;
  },
  // Log when export limit is exceeded
  handler: (req, res) => {
    console.warn(
      `[Security] Export rate limit exceeded for user: ${req.user?.userId || 'unknown'}, ` +
      `IP: ${req.ip}, RequestId: ${req.id}`
    );

    res.status(429).json({
      success: false,
      error: {
        code: 'EXPORT_LIMIT_EXCEEDED',
        message: 'Too many export requests. Please try again later.',
        retryAfter: '1 hour',
        requestId: req.id
      }
    });
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
    return `password-reset:${email.toLowerCase()}`;
  },
  // Log when password reset limit is exceeded (potential attack)
  handler: (req, res) => {
    const email = req.body?.email || req.query?.email || 'unknown';

    console.warn(
      `[Security] Password reset rate limit exceeded for email: ${email}, ` +
      `IP: ${req.ip}, RequestId: ${req.id}`
    );

    res.status(429).json({
      success: false,
      error: {
        code: 'PASSWORD_RESET_LIMIT_EXCEEDED',
        message: 'Too many password reset attempts. Please try again in 1 hour.',
        retryAfter: '1 hour',
        requestId: req.id
      }
    });
  }
});

// ✅ Moderate rate limit for search endpoints (prevent ReDoS)
export const searchLimiter = rateLimit({
  store: new MongoStore({
    uri: mongoUri,
    collectionName: 'rateLimits',
    expireTimeMs: 1 * 60 * 1000  // 1 minute
  }),
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
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = req.user?.userId || req.ip;
    return `search:${userId}`;
  }
});

// ✅ Strict rate limit for file uploads (prevent storage abuse)
export const uploadLimiter = rateLimit({
  store: new MongoStore({
    uri: mongoUri,
    collectionName: 'rateLimits',
    expireTimeMs: 60 * 60 * 1000  // 1 hour
  }),
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
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = req.user?.userId || req.ip;
    return `upload:${userId}`;
  },
  // Log when upload limit is exceeded
  handler: (req, res) => {
    console.warn(
      `[Security] Upload rate limit exceeded for user: ${req.user?.userId || 'unknown'}, ` +
      `IP: ${req.ip}, RequestId: ${req.id}`
    );

    res.status(429).json({
      success: false,
      error: {
        code: 'UPLOAD_LIMIT_EXCEEDED',
        message: 'Too many file uploads. Please try again later.',
        retryAfter: '1 hour',
        requestId: req.id
      }
    });
  }
});

/**
 * Create custom rate limiter with specific configuration
 * @param {Object} options - Rate limiter options
 * @returns {Function} Rate limiter middleware
 */
export const createCustomLimiter = (options) => {
  const {
    windowMs = 60 * 1000,
    max = 10,
    message = 'Too many requests',
    keyPrefix = 'custom'
  } = options;

  return rateLimit({
    store: new MongoStore({
      uri: mongoUri,
      collectionName: 'rateLimits',
      expireTimeMs: windowMs
    }),
    windowMs,
    max,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message,
        retryAfter: `${Math.ceil(windowMs / 60000)} minutes`
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const userId = req.user?.userId || req.ip;
      return `${keyPrefix}:${userId}`;
    }
  });
};
