/**
 * Employee Status Service
 * Handles employee status changes and syncs with Clerk authentication
 * Uses Clerk's built-in lock/unlock functionality to prevent login for inactive employees
 */

import { clerkClient } from '@clerk/clerk-sdk-node';

/**
 * Status configurations that determine if employee should be locked in Clerk
 * @type {Object.<string, {shouldLock: boolean, description: string}>}
 */
const STATUS_CONFIG = {
  'Active': { shouldLock: false, description: 'Employee is active and can access the system' },
  'Probation': { shouldLock: false, description: 'Employee is on probation and can access the system' },
  'On Leave': { shouldLock: false, description: 'Employee is on leave but can access the system' },
  'Resigned': { shouldLock: true, description: 'Employee has resigned and cannot access the system' },
  'Terminated': { shouldLock: true, description: 'Employee has been terminated and cannot access the system' },
  'Inactive': { shouldLock: true, description: 'Employee is inactive and cannot access the system' }
};

/**
 * Check if a given status should lock the user in Clerk
 * @param {string} status - Employee status
 * @returns {boolean} True if user should be locked
 */
export function shouldLockUser(status) {
  if (!status) return false;
  const config = STATUS_CONFIG[status];
  return config ? config.shouldLock : false;
}

/**
 * Get status configuration
 * @param {string} status - Employee status
 * @returns {Object|null} Status configuration
 */
export function getStatusConfig(status) {
  return STATUS_CONFIG[status] || null;
}

/**
 * Lock user in Clerk (prevents login) and revokes all active sessions
 * @param {string} clerkUserId - Clerk User ID
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function lockUserInClerk(clerkUserId) {
  if (!clerkUserId) {
    return {
      success: false,
      message: 'No Clerk User ID provided - cannot lock user'
    };
  }

  try {
    console.log(`[EmployeeStatus] Locking user in Clerk and revoking sessions: ${clerkUserId}`);

    // Step 1: Lock the user in Clerk (prevents new tokens)
    await clerkClient.users.lockUser(clerkUserId);
    console.log(`[EmployeeStatus] User locked in Clerk: ${clerkUserId}`);

    // Step 2: Revoke all active sessions to immediately log out the user
    // Use the sessions API to get and revoke all sessions for this user
    try {
      const sessions = await clerkClient.sessions.getSessionList({
        userId: clerkUserId,
        status: 'active'
      });
      console.log(`[EmployeeStatus] Found ${sessions.data.length} active sessions to revoke`);

      // Revoke each session individually
      for (const session of sessions.data) {
        await clerkClient.sessions.revokeSession(session.id);
      }
      console.log(`[EmployeeStatus] Revoked ${sessions.data.length} sessions for user: ${clerkUserId}`);
    } catch (sessionError) {
      console.warn(`[EmployeeStatus] Failed to revoke sessions (user locked anyway):`, sessionError.message);
      // Continue - user is locked even if session revocation fails
    }

    console.log(`[EmployeeStatus] Successfully locked user in Clerk: ${clerkUserId}`);
    return {
      success: true,
      message: 'User locked in Clerk successfully'
    };
  } catch (error) {
    console.error(`[EmployeeStatus] Failed to lock user in Clerk: ${clerkUserId}`, error);

    // Check if user is already locked
    if (error?.errors?.[0]?.code === 'user_locked') {
      console.log(`[EmployeeStatus] User already locked in Clerk`);
      return {
        success: true,
        message: 'User already locked in Clerk'
      };
    }

    // Check if user not found
    if (error?.status === 404) {
      return {
        success: false,
        message: 'Clerk user not found - user may have been deleted'
      };
    }

    return {
      success: false,
      message: `Failed to lock user: ${error.message || 'Unknown error'}`
    };
  }
}

/**
 * Unlock user in Clerk (allows login)
 * @param {string} clerkUserId - Clerk User ID
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function unlockUserInClerk(clerkUserId) {
  if (!clerkUserId) {
    return {
      success: false,
      message: 'No Clerk User ID provided - cannot unlock user'
    };
  }

  try {
    console.log(`[EmployeeStatus] Unlocking user in Clerk: ${clerkUserId}`);

    // First check if user is currently locked
    const userBefore = await clerkClient.users.getUser(clerkUserId);
    const wasLocked = !!(userBefore?.locked);
    console.log(`[EmployeeStatus] User lock status before unlock: ${wasLocked ? 'LOCKED' : 'UNLOCKED'} (locked: ${userBefore?.locked})`);

    // If user wasn't locked, no need to unlock
    if (!wasLocked) {
      console.log(`[EmployeeStatus] User is already unlocked - no action needed`);
      return {
        success: true,
        message: 'User already unlocked in Clerk'
      };
    }

    // Use Clerk's built-in unlockUser method
    await clerkClient.users.unlockUser(clerkUserId);
    console.log(`[EmployeeStatus] unlockUser API call completed for: ${clerkUserId}`);

    // Verify the unlock worked by checking the user again
    const userAfter = await clerkClient.users.getUser(clerkUserId);
    const isNowLocked = !!(userAfter?.locked);
    console.log(`[EmployeeStatus] User lock status after unlock: ${isNowLocked ? 'LOCKED' : 'UNLOCKED'} (locked: ${userAfter?.locked})`);

    if (isNowLocked) {
      console.error(`[EmployeeStatus] ERROR: unlockUser called but user is still locked: ${clerkUserId}`);
      return {
        success: false,
        message: 'Unlock API called but user is still locked - possible API issue'
      };
    }

    console.log(`[EmployeeStatus] Unlock verified successfully for: ${clerkUserId}`);
    return {
      success: true,
      message: wasLocked ? 'User unlocked in Clerk successfully' : 'User was already unlocked in Clerk'
    };
  } catch (error) {
    console.error(`[EmployeeStatus] Failed to unlock user in Clerk: ${clerkUserId}`);
    console.error(`[EmployeeStatus] Error details:`, {
      name: error?.name,
      message: error?.message,
      status: error?.status,
      code: error?.code,
      errors: JSON.stringify(error?.errors),
      clerkError: error?.clerkError
    });

    // Check if user not found
    if (error?.status === 404) {
      return {
        success: false,
        message: 'Clerk user not found - user may have been deleted'
      };
    }

    // If it's a 422 error, check the error message for more details
    if (error?.status === 422) {
      const errorCode = error?.errors?.[0]?.code;
      const errorMsg = error?.errors?.[0]?.message;
      console.log(`[EmployeeStatus] Got 422 error - code: ${errorCode}, message: ${errorMsg}`);

      // Try to verify current state
      try {
        const user = await clerkClient.users.getUser(clerkUserId);
        if (!user.locked) {
          return {
            success: true,
            message: 'User already unlocked in Clerk'
          };
        }
      } catch (verifyError) {
        console.error(`[EmployeeStatus] Verification check failed:`, verifyError);
      }
    }

    return {
      success: false,
      message: `Failed to unlock user: ${error.message || 'Unknown error'}`
    };
  }
}

/**
 * Update Clerk lock status based on employee status
 * @param {string} clerkUserId - Clerk User ID
 * @param {string} newStatus - New employee status
 * @param {string} oldStatus - Previous employee status (optional)
 * @param {boolean} isActive - Employee's active flag (optional, defaults to true)
 * @returns {Promise<{success: boolean, action: string, message: string}>}
 */
export async function syncClerkLockStatus(clerkUserId, newStatus, oldStatus = null, isActive = true) {
  if (!clerkUserId) {
    console.warn(`[syncClerkLockStatus] No clerkUserId provided - skipping Clerk sync`);
    return {
      success: false,
      action: 'none',
      message: 'No Clerk User ID provided - cannot sync lock status'
    };
  }

  // Check if user should be locked based on BOTH status and isActive
  // User should be locked if:
  // 1. isActive is false, OR
  // 2. Status is one of the lockable statuses (Resigned, Terminated, Inactive)
  const shouldLockDueToStatus = shouldLockUser(newStatus);
  const shouldLock = !isActive || shouldLockDueToStatus;

  console.log(`[syncClerkLockStatus] ============================================`);
  console.log(`[syncClerkLockStatus] clerkUserId: ${clerkUserId}`);
  console.log(`[syncClerkLockStatus] oldStatus: ${oldStatus || '(none)'}`);
  console.log(`[syncClerkLockStatus] newStatus: ${newStatus}`);
  console.log(`[syncClerkLockStatus] isActive: ${isActive}`);
  console.log(`[syncClerkLockStatus] shouldLock (status): ${shouldLockDueToStatus}`);
  console.log(`[syncClerkLockStatus] shouldLock (final): ${shouldLock}`);
  console.log(`[syncClerkLockStatus] ============================================`);

  // If the new status requires locking (Resigned, Terminated, Inactive) OR isActive is false
  if (shouldLock) {
    console.log(`[syncClerkLockStatus] User should be locked - locking in Clerk`);
    const result = await lockUserInClerk(clerkUserId);
    return {
      success: result.success,
      action: 'locked',
      message: result.message
    };
  }

  // If the new status does NOT require locking (Active, Probation, On Leave, etc.)
  // Check if the Clerk account is currently locked, and unlock it if so
  console.log(`[syncClerkLockStatus] User should NOT be locked - checking if Clerk account is locked`);
  const isCurrentlyLocked = await isUserLockedInClerk(clerkUserId);

  console.log(`[syncClerkLockStatus] Clerk account lock check result: ${isCurrentlyLocked ? 'LOCKED' : 'UNLOCKED'}`);

  if (isCurrentlyLocked) {
    console.log(`[syncClerkLockStatus] Clerk account is locked - unlocking user`);
    const result = await unlockUserInClerk(clerkUserId);
    return {
      success: result.success,
      action: 'unlocked',
      message: result.message
    };
  }

  // User is not locked and doesn't need to be locked
  console.log(`[syncClerkLockStatus] Clerk account is already unlocked - no action needed`);
  return {
    success: true,
    action: 'none',
    message: 'User already unlocked in Clerk - no action needed'
  };
}

/**
 * Check if Clerk user is locked
 * @param {string} clerkUserId - Clerk User ID
 * @returns {Promise<boolean>} True if user is locked
 */
export async function isUserLockedInClerk(clerkUserId) {
  if (!clerkUserId) {
    console.warn(`[isUserLockedInClerk] No clerkUserId provided - returning false`);
    return false;
  }

  try {
    const user = await clerkClient.users.getUser(clerkUserId);
    // Clerk uses 'locked' boolean field, NOT 'lockedAt' timestamp
    const isLocked = !!(user?.locked);
    console.log(`[isUserLockedInClerk] User ${clerkUserId}: ${isLocked ? 'LOCKED' : 'UNLOCKED'} (locked: ${user?.locked})`);
    return isLocked;
  } catch (error) {
    console.error(`[isUserLockedInClerk] Failed to check lock status for user: ${clerkUserId}`, {
      name: error?.name,
      message: error?.message,
      status: error?.status
    });
    // Return false on error (assume unlocked if we can't check)
    return false;
  }
}

/**
 * Batch lock/unlock multiple employees
 * @param {Array<{clerkUserId: string, status: string}>} employees - Array of employees with clerkUserId and status
 * @returns {Promise<{locked: number, unlocked: number, failed: number, results: Array}>}
 */
export async function batchSyncClerkLockStatus(employees) {
  const results = [];
  let locked = 0;
  let unlocked = 0;
  let failed = 0;

  for (const employee of employees) {
    const { clerkUserId, status } = employee;
    const shouldLock = shouldLockUser(status);

    let result;
    if (shouldLock) {
      const lockResult = await lockUserInClerk(clerkUserId);
      result = { clerkUserId, status, action: 'lock', ...lockResult };
      if (lockResult.success) locked++;
      else failed++;
    } else {
      const unlockResult = await unlockUserInClerk(clerkUserId);
      result = { clerkUserId, status, action: 'unlock', ...unlockResult };
      if (unlockResult.success) unlocked++;
      else failed++;
    }

    results.push(result);
  }

  return {
    locked,
    unlocked,
    failed,
    results
  };
}

/**
 * Validate if employee can access the system
 * @param {Object} employee - Employee document
 * @returns {Object} Validation result
 */
export function validateEmployeeAccess(employee) {
  if (!employee) {
    return {
      canAccess: false,
      reason: 'Employee not found',
      code: 'EMPLOYEE_NOT_FOUND'
    };
  }

  // Check isActive flag
  if (employee.isActive === false) {
    return {
      canAccess: false,
      reason: 'Employee account is inactive',
      code: 'EMPLOYEE_INACTIVE'
    };
  }

  // Check isDeleted flag
  if (employee.isDeleted === true) {
    return {
      canAccess: false,
      reason: 'Employee account has been deleted',
      code: 'EMPLOYEE_DELETED'
    };
  }

  // Check employmentStatus
  const status = employee.employmentStatus || employee.status;
  if (shouldLockUser(status)) {
    const config = getStatusConfig(status);
    return {
      canAccess: false,
      reason: config?.description || `Employee status is ${status}`,
      code: 'EMPLOYEE_STATUS_BLOCKED',
      status
    };
  }

  return {
    canAccess: true,
    reason: 'Employee can access the system'
  };
}

export default {
  shouldLockUser,
  getStatusConfig,
  lockUserInClerk,
  unlockUserInClerk,
  syncClerkLockStatus,
  isUserLockedInClerk,
  batchSyncClerkLockStatus,
  validateEmployeeAccess
};
