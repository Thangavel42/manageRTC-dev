/**
 * Page Access Middleware
 * Provides middleware for page-level and route-level access control
 *
 * Usage:
 *   import { requirePageAccess, requireRouteAccess } from '../middleware/pageAccess.js';
 *
 *   // Page-level protection
 *   router.get('/employees', requirePageAccess('hrm.employees', 'read'), controller.list);
 *
 *   // Automatic route protection
 *   router.use(requireRouteAccess());
 */

import Page from '../models/rbac/page.schema.js';
import Role from '../models/rbac/role.schema.js';

/**
 * Check if user has access to a specific page with the required action
 * @param {string} pageName - Page identifier (e.g., 'hrm.employees')
 * @param {string} action - Required action (read, create, write, delete, etc.)
 * @returns {Function} Express middleware
 */
export const requirePageAccess = (pageName, action = 'read') => {
  return async (req, res, next) => {
    try {
      // Get user info from request (set by auth middleware)
      const { roleId, companyId, userId } = req.user || {};

      if (!roleId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User role not found. Please log in again.'
        });
      }

      // Get page info
      const page = await Page.findOne({ name: pageName, isActive: true });

      if (!page) {
        // If page not in database, allow access (fallback)
        console.warn(`[PageAccess] Page not found: ${pageName}`);
        return next();
      }

      // Check role permission
      const role = await Role.findById(roleId);
      if (!role) {
        return res.status(401).json({
          success: false,
          error: 'Invalid role',
          message: 'User role not found in system.'
        });
      }

      // Check page access using role method
      const hasAccess = await role.hasPageAccess(page._id, action);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: `You don't have '${action}' permission for this page.`,
          page: pageName
        });
      }

      // Check feature access if company context exists
      if (companyId && page.featureFlags?.requiresFeature?.length > 0) {
        const featureCheck = await checkPlanFeatures(companyId, page.featureFlags.requiresFeature);
        if (!featureCheck.allowed) {
          return res.status(402).json({
            success: false,
            error: 'Feature not available',
            message: 'This feature requires a plan upgrade.',
            missingFeatures: featureCheck.missingFeatures
          });
        }
      }

      // Check access conditions
      if (page.accessConditions) {
        const conditionCheck = checkAccessConditions(req, page.accessConditions, role.name);
        if (!conditionCheck.allowed) {
          return res.status(403).json({
            success: false,
            error: 'Access restricted',
            message: conditionCheck.reason
          });
        }
      }

      // Attach page info to request for later use
      req.page = page;
      req.dataFilter = await buildDataFilter(page, req.user);

      next();
    } catch (error) {
      console.error('[PageAccess] Error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to check page access'
      });
    }
  };
};

/**
 * Automatic route protection middleware
 * Looks up page by API route and checks permissions automatically
 * @returns {Function} Express middleware
 */
export const requireRouteAccess = () => {
  return async (req, res, next) => {
    try {
      // Skip for non-API routes or public endpoints
      if (!req.path.startsWith('/api/') ||
          req.path.startsWith('/api/auth/') ||
          req.path.startsWith('/api/public/')) {
        return next();
      }

      const { roleId, companyId, userId } = req.user || {};

      if (!roleId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      // Find page by API route
      const page = await Page.findByApiRoute(req.method, req.path);

      if (!page) {
        // No page mapping found - allow access (fallback to other auth checks)
        return next();
      }

      // Determine required action from HTTP method
      const action = getActionFromMethod(req.method, page);

      // Check role permission
      const role = await Role.findById(roleId);
      if (!role) {
        return res.status(401).json({
          success: false,
          error: 'Invalid role'
        });
      }

      const hasAccess = await role.hasPageAccess(page._id, action);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: `You don't have '${action}' permission for this resource.`,
          page: page.name
        });
      }

      // Attach page info and data filter
      req.page = page;
      req.dataFilter = await buildDataFilter(page, req.user);

      next();
    } catch (error) {
      console.error('[RouteAccess] Error:', error);
      next();
    }
  };
};

/**
 * Middleware to check feature access for a page
 * @param {string} pageName - Page identifier
 * @returns {Function} Express middleware
 */
export const requireFeatureAccess = (pageName) => {
  return async (req, res, next) => {
    try {
      const { companyId } = req.user || {};

      if (!companyId) {
        return next();
      }

      const featureCheck = await Page.checkFeatureAccess(pageName, getCompanyFeatures(companyId));

      if (!featureCheck.allowed) {
        return res.status(402).json({
          success: false,
          error: 'Feature not available',
          message: 'Please upgrade your plan to access this feature.',
          missingFeatures: featureCheck.missingFeatures
        });
      }

      next();
    } catch (error) {
      console.error('[FeatureAccess] Error:', error);
      next();
    }
  };
};

/**
 * Middleware to add data filtering based on page data scope
 * @param {string} pageName - Page identifier
 * @returns {Function} Express middleware
 */
export const applyDataScope = (pageName) => {
  return async (req, res, next) => {
    try {
      const { userId, companyId, departmentId } = req.user || {};

      req.dataFilter = await Page.buildDataFilter(pageName, {
        userId,
        companyId,
        departmentId
      });

      next();
    } catch (error) {
      console.error('[DataScope] Error:', error);
      req.dataFilter = {};
      next();
    }
  };
};

/**
 * Helper: Get action from HTTP method
 */
function getActionFromMethod(method, page) {
  const methodActionMap = {
    GET: 'read',
    POST: 'create',
    PUT: 'write',
    PATCH: 'write',
    DELETE: 'delete'
  };

  // Check if page has custom API route mapping
  if (page.apiRoutes && page.apiRoutes.length > 0) {
    const routeConfig = page.apiRoutes.find(r =>
      r.method === method.toUpperCase() || r.method === '*'
    );
    if (routeConfig) {
      return routeConfig.action;
    }
  }

  return methodActionMap[method.toUpperCase()] || 'read';
}

/**
 * Helper: Check access conditions
 */
function checkAccessConditions(req, conditions, roleName) {
  // Check allowed roles
  if (conditions.allowedRoles && conditions.allowedRoles.length > 0) {
    if (!conditions.allowedRoles.includes(roleName)) {
      return {
        allowed: false,
        reason: 'Your role is not allowed to access this page.'
      };
    }
  }

  // Check denied roles
  if (conditions.deniedRoles && conditions.deniedRoles.length > 0) {
    if (conditions.deniedRoles.includes(roleName)) {
      return {
        allowed: false,
        reason: 'Your role is restricted from accessing this page.'
      };
    }
  }

  // Check time restrictions
  if (conditions.timeRestricted?.enabled) {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    const { allowedHours, allowedDays } = conditions.timeRestricted;

    if (allowedHours && (hour < allowedHours.start || hour > allowedHours.end)) {
      return {
        allowed: false,
        reason: `This page is only accessible between ${allowedHours.start}:00 and ${allowedHours.end}:00.`
      };
    }

    if (allowedDays && allowedDays.length > 0 && !allowedDays.includes(day)) {
      return {
        allowed: false,
        reason: 'This page is not accessible today.'
      };
    }
  }

  // Check IP restrictions
  if (conditions.ipRestricted?.enabled) {
    const clientIP = req.ip || req.connection.remoteAddress;

    if (conditions.ipRestricted.deniedIPs?.includes(clientIP)) {
      return {
        allowed: false,
        reason: 'Access denied from your IP address.'
      };
    }

    if (conditions.ipRestricted.allowedIPs?.length > 0 &&
        !conditions.ipRestricted.allowedIPs.includes(clientIP)) {
      return {
        allowed: false,
        reason: 'Access denied from your IP address.'
      };
    }
  }

  return { allowed: true };
}

/**
 * Helper: Check plan features
 */
async function checkPlanFeatures(companyId, requiredFeatures) {
  // This would typically query the Company and Plan models
  // For now, return a simple implementation
  try {
    // Import Company model dynamically to avoid circular dependencies
    const Company = (await import('../models/superadmin/company.schema.js')).default;
    const Plan = (await import('../models/superadmin/package.schema.js')).default;

    const company = await Company.findById(companyId).populate('planId');
    if (!company || !company.planId) {
      return { allowed: false, missingFeatures: requiredFeatures };
    }

    const planFeatures = company.planId.features || [];
    const missingFeatures = requiredFeatures.filter(f => !planFeatures.includes(f));

    return {
      allowed: missingFeatures.length === 0,
      missingFeatures
    };
  } catch (error) {
    console.error('[FeatureCheck] Error:', error);
    return { allowed: true }; // Allow on error
  }
}

/**
 * Helper: Get company features (placeholder)
 */
function getCompanyFeatures(companyId) {
  // This would typically fetch from cache or database
  return [];
}

/**
 * Helper: Build data filter from page data scope
 */
async function buildDataFilter(page, user) {
  if (!page?.dataScope) {
    return {};
  }

  return Page.buildDataFilter(page.name, {
    userId: user?.userId,
    companyId: user?.companyId,
    departmentId: user?.departmentId
  });
}

export default {
  requirePageAccess,
  requireRouteAccess,
  requireFeatureAccess,
  applyDataScope
};
