/**
 * Authentication Middleware for REST APIs
 * Verifies Clerk JWT tokens and extracts user metadata
 * Uses the same token verification approach as Socket.IO
 * Includes employee status validation to prevent inactive users from accessing the system
 */

import dotenv from 'dotenv';
dotenv.config();

import { clerkClient, verifyToken } from '@clerk/express';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { client, getTenantCollections } from '../config/db.js';
import employeeStatusService, { isUserLockedInClerk } from '../services/employee/employeeStatus.service.js';

// ⚠️ SECURITY WARNING: Development mode is hardcoded to true!
// This is a DEVELOPMENT workaround that MUST be removed before production deployment.
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.DEV_MODE === 'true';

// Authorized parties — set EXTRA_ALLOWED_ORIGINS in .env as comma-separated list
const extraParties = process.env.EXTRA_ALLOWED_ORIGINS
  ? process.env.EXTRA_ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : [];
const authorizedParties = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL,
  ...extraParties,
].filter(Boolean);

// Clerk keys — required, no empty-string fallback
const CLERK_JWT_KEY = process.env.CLERK_JWT_KEY;
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
if (!CLERK_JWT_KEY || !CLERK_SECRET_KEY) {
  throw new Error('CLERK_JWT_KEY and CLERK_SECRET_KEY must be set in environment variables');
}

/**
 * Authenticate - Main authentication middleware
 * Verifies Clerk JWT token and attaches user info to request
 * Uses the same approach as Socket.IO authentication
 */
// Track auth request count for session identification
let authRequestCount = 0;

export const authenticate = async (req, res, next) => {
  authRequestCount++;
  const authSeq = authRequestCount;

  console.log(`\n🔐 [Auth #${authSeq}] ${req.id} → ${req.method} ${req.path}`);

  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log(`   ❌ No Bearer token - ${req.id}`);
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
        clockSkewInMs: 30000, // Allow 30 seconds clock skew between Clerk and this server
      });
    } catch (verifyError) {
      console.log(`   ❌ Token failed: ${verifyError.message} - ${req.id}`);
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
      console.log(`   ❌ Invalid token (no sub) - ${req.id}`);
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required - invalid token',
          requestId: req.id || 'no-id',
        },
      });
    }

    // Fetch user from Clerk to get metadata (same as Socket.IO)
    let user;
    try {
      user = await clerkClient.users.getUser(verifiedToken.sub);
    } catch (clerkError) {
      console.log(`   ❌ Clerk fetch failed: ${clerkError.message} - ${req.id}`);
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication error: Failed to fetch user data',
          requestId: req.id || 'no-id',
        },
      });
    }

    // SECURITY CHECK: If user is locked in Clerk, deny access immediately
    // This applies to ALL users regardless of role (employee, HR, Admin, etc.)
    // Even HR/Admin users are blocked when their account is locked/inactive
    const isLocked = !!(user?.lockedAt);
    if (isLocked) {
      console.log(`   🔒 USER LOCKED IN CLERK: ${verifiedToken.sub} - lockedAt: ${user.lockedAt}`);
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_LOCKED',
          message: 'Your account has been deactivated. Please contact HR or system administrator.',
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

    // ⚠️ SECURITY WARNING: DEVELOPMENT WORKAROUND!
    // In development mode, if users don't have a companyId, use the DEV_COMPANY_ID from env
    // This is a TEMPORARY FIX that MUST be removed before production deployment!
    // This matches the Socket.IO authentication behavior
    // Applies to all non-superadmin roles (employee, admin, hr, manager)
    if (isDevelopment && (role === "admin" || role === "hr" || role === "manager" || role === "employee") && !companyId) {
      const devCompanyId = process.env.DEV_COMPANY_ID;
      if (devCompanyId) {
        companyId = devCompanyId;
        console.log(`   ⚠️  DEV_MODE: Using DEV_COMPANY_ID for ${role}`);
      } else {
        console.log(`   ❌ No companyId for ${role} user`);
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

    console.log(`   ✅ ${role.toUpperCase()} | ${user.id.substring(0, 10)}... | ${companyId || 'N/A'}`);

    next();
  } catch (error) {
    // Check if the error is due to token expiration (normal occurrence)
    if (error.message && (error.message.includes('expired') || error.message.includes('JWT is expired'))) {
      console.log(`   ⏰ Token expired - ${req.id}`);
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
    console.log(`   ❌ Auth error: ${error.message} - ${req.id}`);
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
 * requireEmployeeActive - Validates employee status to prevent inactive users from accessing the system
 * Checks if employee is active, not deleted, and not in a blocked status (Resigned, Terminated, Inactive)
 * Superadmin, Admin, and HR bypass this check (they need to manage other employees)
 * Should be used after authenticate middleware
 */
export const requireEmployeeActive = async (req, res, next) => {
  // Admin, HR, and Superadmin bypass employee status check (case-insensitive)
  // They need to access the system to manage other employees
  const role = req.user?.role?.toLowerCase();
  if (role === 'superadmin' || role === 'admin' || role === 'hr') {
    return next();
  }

  // No user object - should not happen if authenticate is used first
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

  // No companyId - employee users must have a company
  if (!req.user.companyId) {
    console.log(`   ❌ No companyId for ${req.user.role} user`);
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Must belong to a company',
        requestId: req.id || 'no-id',
      },
    });
  }

  try {
    // Get employee from company database
    const collections = getTenantCollections(req.user.companyId);
    const employee = await collections.employees.findOne({
      clerkUserId: req.user.userId
    });

    // Validate employee access
    const validation = employeeStatusService.validateEmployeeAccess(employee);

    if (!validation.canAccess) {
      console.log(`   🔒 EMPLOYEE BLOCKED: ${req.user.userId} - ${validation.reason}`);

      // Special handling for different error codes
      if (validation.code === 'EMPLOYEE_NOT_FOUND') {
        return res.status(403).json({
          success: false,
          error: {
            code: validation.code,
            message: 'Employee profile not found. Please contact HR or system administrator.',
            requestId: req.id || 'no-id',
          },
        });
      }

      // For inactive/resigned/terminated employees
      return res.status(403).json({
        success: false,
        error: {
          code: validation.code,
          message: validation.reason,
          requestId: req.id || 'no-id',
          details: validation.status ? {
            status: validation.status,
            note: 'Your account has been deactivated. Please contact HR or system administrator.'
          } : undefined
        },
      });
    }

    // Employee is active, attach employee data to request
    req.employee = employee;
    next();
  } catch (error) {
    console.error(`   ❌ Employee status check error: ${error.message} - ${req.id}`);
    return res.status(500).json({
      success: false,
      error: {
        code: 'EMPLOYEE_STATUS_CHECK_FAILED',
        message: 'Failed to verify employee status',
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
      console.log(`   🔒 FORBIDDEN: ${req.user.role} needs ${roles.join('/')}`);
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
    next();
  };
};

/**
 * requireCompany - Ensures user belongs to a company
 * Superadmin bypasses this check (case-insensitive)
 */
export const requireCompany = (req, res, next) => {
  // Superadmin doesn't need company (case-insensitive check)
  if (req.user && req.user.role?.toLowerCase() === 'superadmin') {
    return next();
  }

  if (!req.user || !req.user.companyId) {
    console.log(`   ❌ No company for ${req.user?.role}`);
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
        clockSkewInMs: 30000, // Allow 30 seconds clock skew between Clerk and this server
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
  requireEmployeeActive,
  optionalAuth,
  attachRequestId,
};
