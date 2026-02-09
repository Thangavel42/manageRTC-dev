/**
 * Sync Employee Role to Clerk API
 *
 * Updates Clerk user's publicMetadata.role to match MongoDB employee's account.role
 * This is useful when roles get out of sync between systems
 *
 * POST /api/sync-role
 * Body: { "email": "hr1@gmail.com" }
 * Access: Admin, Superadmin
 */

import { clerkClient } from '@clerk/clerk-sdk-node';
import { asyncHandler, buildValidationError } from '../../middleware/errorHandler.js';
import { extractUser, sendSuccess } from '../../utils/apiResponse.js';
import { client, getTenantCollections } from '../../config/db.js';
import { devLog, devError } from '../../utils/logger.js';

/**
 * @desc    Sync employee role from MongoDB to Clerk
 * @route   POST /api/sync-role
 * @access  Private (Admin, Superadmin)
 */
export const syncRoleToClerk = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = extractUser(req);

  devLog('[Sync Role API] Starting sync for employee:', email, 'by:', user.userId);

  // Validate email
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw buildValidationError('email', 'Valid email address is required');
  }

  // Check authorization (only admin and superadmin can sync roles)
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Only Admin and Superadmin can sync roles'
      }
    });
  }

  // Find employee by email
  const collections = getTenantCollections(user.companyId);
  const employee = await collections.employees.findOne({
    email: email.toLowerCase(),
    isDeleted: { $ne: true }
  });

  if (!employee) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'EMPLOYEE_NOT_FOUND',
        message: `Employee not found: ${email}`
      }
    });
  }

  devLog('[Sync Role API] Found employee:', {
    employeeId: employee.employeeId,
    name: `${employee.firstName} ${employee.lastName}`,
    clerkUserId: employee.clerkUserId,
    mongoRole: employee.account?.role
  });

  if (!employee.clerkUserId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'NO_CLERK_USER',
        message: 'Employee has no clerkUserId - cannot sync'
      }
    });
  }

  // Get the role from MongoDB
  const mongoRole = employee.account?.role;
  if (!mongoRole) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'NO_ROLE',
        message: 'Employee has no role in account.role field'
      }
    });
  }

  // Normalize role to lowercase for Clerk
  const normalizedRole = mongoRole.toLowerCase();
  const validRoles = ['superadmin', 'admin', 'hr', 'manager', 'leads', 'employee'];

  if (!validRoles.includes(normalizedRole)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ROLE',
        message: `Invalid role: ${mongoRole}`
      }
    });
  }

  devLog('[Sync Role API] Syncing role to Clerk:', { mongoRole, normalizedRole });

  try {
    // Update Clerk user's metadata
    const updatedUser = await clerkClient.users.updateUser(employee.clerkUserId, {
      publicMetadata: {
        role: normalizedRole,
        companyId: employee.companyId || null,
        employeeId: employee.employeeId || null
      }
    });

    devLog('[Sync Role API] Successfully updated Clerk user:', {
      clerkUserId: updatedUser.id,
      newRole: updatedUser.publicMetadata?.role,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.emailAddresses?.[0]?.emailAddress
    });

    return sendSuccess(res, {
      employeeEmail: email,
      employeeId: employee.employeeId,
      clerkUserId: employee.clerkUserId,
      oldRole: mongoRole,
      newRole: normalizedRole,
      message: 'Role synced to Clerk successfully. Please refresh browser to see changes.'
    }, 'Role synced successfully');

  } catch (clerkError) {
    devError('[Sync Role API] Clerk Error:', clerkError);
    return res.status(500).json({
      success: false,
      error: {
        code: 'CLERK_ERROR',
        message: clerkError.message || 'Failed to update Clerk user',
        details: clerkError
      }
    });
  }
});

export default {
  syncRoleToClerk
};
