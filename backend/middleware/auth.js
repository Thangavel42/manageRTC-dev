/**
 * Authentication Middleware for REST APIs
 * Verifies Clerk JWT tokens and extracts user metadata
 * Uses the same token verification approach as Socket.IO
 */

import dotenv from 'dotenv';
dotenv.config();

import { clerkClient, verifyToken } from '@clerk/express';
import { createClerkClient } from '@clerk/clerk-sdk-node';

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

// Use JWT key directly - Clerk's verifyToken accepts the raw base64 key
const CLERK_JWT_KEY = process.env.CLERK_JWT_KEY || '';
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || '';

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
    console.log('[Auth Middleware] Attempting token verification...', {
      hasSecretKey: !!CLERK_SECRET_KEY,
      secretKeyPrefix: CLERK_SECRET_KEY?.substring(0, 10) + '...',
      requestId: req.id,
    });

    let verifiedToken;
    try {
      // Use secretKey for most reliable verification
      // Clerk will fetch the correct JWT key from the API
      verifiedToken = await verifyToken(token, {
        secretKey: CLERK_SECRET_KEY,
      });
    } catch (verifyError) {
      console.error('[Auth Middleware] Token verification error:', {
        name: verifyError.name,
        message: verifyError.message,
        code: verifyError.code,
        stack: verifyError.stack,
        requestId: req.id,
      });
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_VERIFICATION_FAILED',
          message: verifyError.message || 'Token verification failed',
          debug: process.env.NODE_ENV === 'development' ? verifyError.toString() : undefined,
          requestId: req.id || 'no-id',
        },
      });
    }

    if (!verifiedToken || !verifiedToken.sub) {
      console.error('[Auth Middleware] Token verification failed - no sub claim', {
        hasVerifiedToken: !!verifiedToken,
        keys: verifiedToken ? Object.keys(verifiedToken) : [],
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
    // Normalize role to lowercase for consistent case-insensitive comparisons
    let role = (user.publicMetadata?.role || 'public')?.toLowerCase();
    // Check for both 'companyId' and 'company' field names in metadata
    let companyId = user.publicMetadata?.companyId || user.publicMetadata?.company || null;
    let employeeId = user.publicMetadata?.employeeId || null;

    // DEBUG: Log role detection details
    console.log('[Auth Middleware] Role detection:', {
      rawRole: user.publicMetadata?.role,
      normalizedRole: role,
      roleType: typeof user.publicMetadata?.role,
      isAdminVerified: user.publicMetadata?.isAdminVerified,
      isAdminVerifiedType: typeof user.publicMetadata?.isAdminVerified,
      isDevelopment,
    });

    console.log('[Auth Middleware] User metadata:', {
      userId: user.id,
      role,
      companyId,
      employeeId,
      publicMetadata: user.publicMetadata,
      requestId: req.id,
    });

    // ⚠️ SECURITY WARNING: DEVELOPMENT WORKAROUND!
    // In development mode, if admin/hr users don't have a companyId, use the DEV_COMPANY_ID from env
    // This is a TEMPORARY FIX that MUST be removed before production deployment!
    // This matches the Socket.IO authentication behavior
    if (isDevelopment && (role === "admin" || role === "hr") && !companyId) {
      const devCompanyId = process.env.DEV_COMPANY_ID;
      if (devCompanyId) {
        companyId = devCompanyId;
        console.warn(
          `🔧 DEVELOPMENT WORKAROUND: Using DEV_COMPANY_ID ${companyId} for ${role} user`
        );
      } else {
        console.error(
          '❌ SECURITY ERROR: Admin/HR user missing companyId and DEV_COMPANY_ID not set in environment!'
        );
        console.error(
          '⚠️ Please either set the companyId in Clerk user metadata or set DEV_COMPANY_ID environment variable'
        );
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Company ID not found in user profile. Please contact system administrator.',
            requestId: req.id || 'no-id',
          },
        });
      }
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
    // Check if the error is due to token expiration (normal occurrence)
    if (error.message && (error.message.includes('expired') || error.message.includes('JWT is expired'))) {
      console.warn('[Auth Middleware] Token expired (normal) - client should refresh:', {
        error: error.message,
        requestId: req.id
      });

      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Authentication token has expired. Please refresh your session.',
          requestId: req.id || 'no-id',
        },
      });
    }

    // Other authentication errors (actual problems)
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
 * All role comparisons are case-insensitive
 *
 * @param {...string} roles - Allowed roles
 * @returns {Function} Express middleware function
 */
export const requireRole = (...roles) => {
  // Normalize all required roles to lowercase for case-insensitive comparison
  const normalizedRoles = roles.map(r => r?.toLowerCase());
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

    // Check if user has one of the required roles (case-insensitive)
    if (!normalizedRoles.includes(req.user.role?.toLowerCase())) {
      console.warn('[Authorization Failed]', {
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRoles: normalizedRoles,
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

  // Superadmin doesn't need company (case-insensitive check)
  if (req.user && req.user.role?.toLowerCase() === 'superadmin') {
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
        secretKey: CLERK_SECRET_KEY,
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

// Export alias for compatibility with existing code
export const authenticateUser = authenticate;

export default {
  authenticate,
  authenticateUser,
  requireRole,
  requireCompany,
  optionalAuth,
  attachRequestId,
};
