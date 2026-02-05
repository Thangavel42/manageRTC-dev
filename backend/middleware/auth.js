/**
 * Authentication Middleware for REST APIs
 * Verifies Clerk JWT tokens and extracts user metadata
 * Uses the same token verification approach as Socket.IO
 */

import dotenv from 'dotenv';
dotenv.config();

import { clerkClient, verifyToken } from '@clerk/express';

// ⚠️ SECURITY WARNING: Development mode is hardcoded to true!
// This is a DEVELOPMENT workaround that MUST be removed before production deployment.
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.DEV_MODE === 'true';

// Authorized parties for JWT verification
const authorizedParties = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://dev.manage-rtc.com',
  'https://apidev.manage-rtc.com',
];

/**
 * Authenticate - Main authentication middleware
 * Verifies Clerk JWT token and attaches user info to request
 * Uses the same approach as Socket.IO authentication
 */
export const authenticate = async (req, res, next) => {
  console.log('[Auth Middleware] Starting authentication...', {
    hasAuthHeader: !!req.headers.authorization,
    authHeaderPrefix: req.headers.authorization?.substring(0, 10),
    requestId: req.id,
  });

  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[Auth Middleware] No Bearer token found', { requestId: req.id });
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required - no token provided',
          requestId: req.id || 'no-id',
        },
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token using Clerk's verifyToken (same as Socket.IO)
    const verifiedToken = await verifyToken(token, {
      jwtKey: process.env.CLERK_JWT_KEY,
      authorizedParties,
    });

    if (!verifiedToken || !verifiedToken.sub) {
      console.error('[Auth Middleware] Token verification failed - no sub claim', {
        requestId: req.id,
      });
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required - invalid token',
          requestId: req.id || 'no-id',
        },
      });
    }

    console.log('[Auth Middleware] Token verified', {
      userId: verifiedToken.sub,
      requestId: req.id,
    });

    // Fetch user from Clerk to get metadata (same as Socket.IO)
    let user;
    try {
      user = await clerkClient.users.getUser(verifiedToken.sub);
    } catch (clerkError) {
      console.error('[Auth Middleware] Failed to fetch user from Clerk:', {
        error: clerkError.message,
        userId: verifiedToken.sub,
        requestId: req.id,
      });
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication error: Failed to fetch user data',
          requestId: req.id || 'no-id',
        },
      });
    }

    // Extract role and companyId from user metadata (same as Socket.IO)
    let role = user.publicMetadata?.role || 'public';
    // Check for both 'companyId' and 'company' field names in metadata
    let companyId = user.publicMetadata?.companyId || user.publicMetadata?.company || null;
    let employeeId = user.publicMetadata?.employeeId || null;

    console.log('[Auth Middleware] User metadata:', {
      userId: user.id,
      role,
      companyId,
      employeeId,
      publicMetadata: user.publicMetadata,
      requestId: req.id,
    });

    // ⚠️ SECURITY WARNING: DEVELOPMENT WORKAROUND!
    // Auto-assigning companyId for admin/hr users in development
    // This matches the Socket.IO authentication behavior
    // This is a TEMPORARY FIX that MUST be removed before production deployment!
    if (isDevelopment && (role === 'admin' || role === 'hr') && !companyId) {
      companyId = '68443081dcdfe43152aebf80';
      console.warn(
        `🔧 DEVELOPMENT WORKAROUND: Auto-assigning companyId ${companyId} to ${role} user`
      );
      console.warn('⚠️ This hardcoded companyId assignment MUST be removed before production!');
    }

    // Attach user info to request (same structure as Socket.IO)
    req.user = {
      userId: verifiedToken.sub,
      companyId: companyId,
      employeeId: employeeId,
      role: role,
      email: user.primaryEmailAddress?.emailAddress,
      publicMetadata: user.publicMetadata,
    };

    // Also attach auth object for compatibility with any code that uses req.auth
    req.auth = {
      userId: verifiedToken.sub,
      sub: verifiedToken.sub,
      publicMetadata: user.publicMetadata,
      primaryEmailAddress: user.primaryEmailAddress,
    };

    console.log('[Auth Success]', {
      userId: req.user.userId,
      role: req.user.role,
      companyId: req.user.companyId,
      requestId: req.id,
    });

    next();
  } catch (error) {
    console.error('[Auth Middleware Error]', {
      error: error.message,
      stack: error.stack,
      requestId: req.id,
    });

    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: error.message || 'Authentication required',
        requestId: req.id || 'no-id',
      },
    });
  }
};

/**
 * requireRole - Role-based authorization middleware
 * Checks if authenticated user has one of the required roles
 *
 * @param {...string} roles - Allowed roles
 * @returns {Function} Express middleware function
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    // First ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          requestId: req.id || 'no-id',
        },
      });
    }

    // Check if user has one of the required roles
    if (!roles.includes(req.user.role)) {
      console.warn('[Authorization Failed]', {
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRoles: roles,
        requestId: req.id,
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Insufficient permissions. Required roles: ${roles.join(', ')}`,
          requestId: req.id || 'no-id',
        },
      });
    }

    // User is authenticated and has required role
    console.log('[Authorization Success]', {
      userId: req.user.userId,
      role: req.user.role,
      companyId: req.user.companyId,
      requestId: req.id,
    });

    next();
  };
};

/**
 * requireCompany - Ensures user belongs to a company
 * Superadmin bypasses this check (case-insensitive)
 */
export const requireCompany = (req, res, next) => {
  console.log('[RequireCompany] Checking company requirement...', {
    hasUser: !!req.user,
    userId: req.user?.userId,
    role: req.user?.role,
    companyId: req.user?.companyId,
    requestId: req.id,
  });

  // Superadmin doesn't need company
  if (req.user && req.user.role === 'superadmin') {
    console.log('[RequireCompany] Superadmin bypass', { requestId: req.id });
    return next();
  }

  if (!req.user || !req.user.companyId) {
    console.warn('[Company Check Failed]', {
      userId: req.user?.userId,
      role: req.user?.role,
      hasCompanyId: !!req.user?.companyId,
      companyId: req.user?.companyId,
      requestId: req.id,
    });

    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Must belong to a company',
        requestId: req.id || 'no-id',
      },
    });
  }

  next();
};

/**
 * optionalAuth - Allows access without authentication
 * Useful for public endpoints
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Token provided, try to verify it
      const token = authHeader.substring(7);

      const verifiedToken = await verifyToken(token, {
        jwtKey: process.env.CLERK_JWT_KEY,
        authorizedParties,
      });

      if (verifiedToken && verifiedToken.sub) {
        // Token is valid, attach user info
        const user = await clerkClient.users.getUser(verifiedToken.sub);

        req.user = {
          userId: verifiedToken.sub,
          // Check for both 'companyId' and 'company' field names in metadata
          companyId: user.publicMetadata?.companyId || user.publicMetadata?.company || null,
          role: user.publicMetadata?.role || 'public',
          email: user.primaryEmailAddress?.emailAddress,
        };

        req.auth = {
          userId: verifiedToken.sub,
          sub: verifiedToken.sub,
          publicMetadata: user.publicMetadata,
        };
      }
    }

    // Continue regardless of auth result
    next();
  } catch (error) {
    // No authentication required, continue without auth
    next();
  }
};

/**
 * attachRequestId - Adds unique request ID for tracing
 */
export const attachRequestId = (req, res, next) => {
  // Generate or use existing request ID
  req.id =
    req.headers['x-request-id'] ||
    `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

  // Add request ID to response headers for tracing
  res.setHeader('X-Request-ID', req.id);

  next();
};

export default {
  authenticate,
  requireRole,
  requireCompany,
  optionalAuth,
  attachRequestId,
};
