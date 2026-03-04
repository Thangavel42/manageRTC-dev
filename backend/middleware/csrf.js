/**
 * CSRF Protection Middleware
 * Protects against Cross-Site Request Forgery attacks
 *
 * SECURITY FIX - Phase 2, Task 2.4
 * Created: 2026-03-02
 *
 * NOTE: csurf package is deprecated. Consider migrating to:
 * - SameSite cookies (already using 'strict' in production)
 * - Custom token-based CSRF protection
 * - Double-submit cookie pattern
 */

import csrf from 'csurf';

// Configure CSRF protection
export const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',  // HTTPS only in production
    sameSite: 'strict',  // Prevents CSRF via browser behavior
    maxAge: 3600000  // 1 hour
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
 * Provides consistent error response format
 */
export const csrfErrorHandler = (err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    console.warn(
      `[Security] CSRF token validation failed. ` +
      `User: ${req.user?.userId || 'unknown'}, ` +
      `IP: ${req.ip}, ` +
      `RequestId: ${req.id}`
    );

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

/**
 * Conditional CSRF middleware
 * Skips CSRF for GET/HEAD/OPTIONS, webhook endpoints, and JWT-authenticated requests
 *
 * NOTE: CSRF protection is primarily for cookie-based sessions.
 * JWT-authenticated APIs don't need CSRF since the token is stored in memory/localStorage
 * and sent via Authorization header (not automatically by browsers).
 */
export const conditionalCsrf = (req, res, next) => {
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF for webhook endpoints (use other verification)
  if (req.path.startsWith('/webhooks/')) {
    return next();
  }

  // Skip CSRF for JWT-authenticated requests (Bearer token in Authorization header)
  // JWT provides its own protection - CSRF is only needed for cookie-based auth
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next();
  }

  // Skip CSRF for API endpoints during development (optional)
  if (process.env.NODE_ENV === 'development' && process.env.DISABLE_CSRF === 'true') {
    console.warn('[CSRF] CSRF protection disabled in development mode');
    return next();
  }

  // Apply CSRF protection only for non-authenticated state-changing requests
  csrfProtection(req, res, next);
};
