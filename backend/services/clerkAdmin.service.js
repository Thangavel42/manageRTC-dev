/**
 * Clerk Admin Service
 * Handles Clerk Admin API operations for Super Admin user management
 */

import { createClerkClient } from '@clerk/backend';
import SuperAdminUser from '../models/superadminUser.schema.js';

// Initialize Clerk Admin API
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

/**
 * Generate a random password
 * @param {number} length - Length of password (default 12)
 * @returns {string} Random password
 */
function generatePassword(length = 12) {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  const all = lowercase + uppercase + numbers + special;
  let password = '';

  // Ensure at least one of each type
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Create a Super Admin user in Clerk
 * @param {Object} userData - User data
 * @param {string} userData.email - User email
 * @param {string} userData.firstName - First name
 * @param {string} userData.lastName - Last name
 * @param {string} userData.phone - Phone number
 * @param {string} userData.gender - Gender
 * @param {string} userData.address - Address (optional)
 * @param {string} userData.profileImage - Profile Image URL (optional)
 * @param {string} userData.password - Password (optional, will generate if not provided)
 * @returns {Promise<Object>} Created user data
 */
export async function createSuperAdminUser(userData) {
  try {
    const { email, firstName, lastName, phone, gender, address, profileImage, createdBy, creatorName } = userData;

    // Always auto-generate password (16 characters)
    const generatedPassword = generatePassword(16);

    // Create user in Clerk (only store role in metadata, other data in database)
    const clerkUser = await clerk.users.createUser({
      emailAddress: [email],
      firstName,
      lastName,
      password: generatedPassword,
      publicMetadata: {
        role: 'superadmin',
      },
    });

    // Verify metadata was set correctly by fetching the user again
    // Use retry logic to handle any propagation delays
    let verifiedUser;
    const maxRetries = 3;
    let metadataVerified = false;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[createSuperAdminUser] Metadata verification attempt ${attempt}/${maxRetries}...`);

        // Wait a moment before each retry (except first)
        if (attempt > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        verifiedUser = await clerk.users.getUser(clerkUser.id);
        const actualRole = verifiedUser.publicMetadata?.role;

        console.log('[createSuperAdminUser] Metadata verification:', {
          clerkUserId: clerkUser.id,
          expectedRole: 'superadmin',
          actualRole,
          roleMatch: actualRole === 'superadmin',
          attempt,
        });

        // Check if role is set correctly
        if (actualRole === 'superadmin') {
          metadataVerified = true;
          console.log('[createSuperAdminUser] ✅ Metadata verified successfully!');
          break;
        }

        // If this wasn't the last attempt, try to update the role
        if (attempt < maxRetries) {
          console.warn('[createSuperAdminUser] Role not set correctly, attempting to update...');
          await clerk.users.updateUser(clerkUser.id, {
            publicMetadata: {
              role: 'superadmin',
            },
          });
          console.log('[createSuperAdminUser] Role update attempted, will verify again...');
        }
      } catch (verifyError) {
        console.error(`[createSuperAdminUser] Metadata verification attempt ${attempt} failed:`, verifyError.message);

        if (attempt === maxRetries) {
          // Final attempt failed, but we'll still proceed with the user creation
          console.error('[createSuperAdminUser] ⚠️ All verification attempts failed, proceeding with user creation');
          break;
        }
      }
    }

    // Log final verification status
    if (!metadataVerified) {
      console.error('[createSuperAdminUser] ⚠️ WARNING: Metadata could not be verified after all retries');
      console.error('[createSuperAdminUser] User may need to use "Refresh Metadata" button after signing in');
    }

    // Create record in database
    const dbUser = await SuperAdminUser.create({
      clerkUserId: clerkUser.id,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      email,
      phone,
      gender,
      address: address || null,
      profileImage: profileImage || null,
      status: 'active',
      inviteAccepted: false,
      createdBy: createdBy || null,
      creatorName: creatorName || null,
    });

    return {
      success: true,
      user: dbUser,
      clerkUser: {
        id: clerkUser.id,
        email,
        firstName,
        lastName,
        publicMetadata: verifiedUser?.publicMetadata || clerkUser.publicMetadata,
      },
      password: generatedPassword,
      message: 'Super Admin user created successfully',
    };
  } catch (error) {
    console.error('Error creating superadmin user:', error);

    // Handle specific Clerk errors
    if (error.errors) {
      const clerkErrors = error.errors.map(e => e.message).join(', ');
      return {
        success: false,
        error: `Clerk error: ${clerkErrors}`,
      };
    }

    return {
      success: false,
      error: error.message || 'Failed to create superadmin user',
    };
  }
}

/**
 * Send email invitation to a superadmin user
 * @param {Object} inviteData - Invitation data
 * @param {string} inviteData.email - User email
 * @param {string} inviteData.firstName - First name
 * @param {string} inviteData.lastName - Last name
 * @param {string} inviteData.inviteUrl - Invitation URL (optional)
 * @returns {Promise<Object>} Invitation result
 */
export async function inviteSuperAdminUser(inviteData) {
  try {
    const { email, firstName, lastName, inviteUrl } = inviteData;

    // Create invitation in Clerk
    const invitation = await clerk.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: {
        role: 'superadmin',
        firstName,
        lastName,
      },
      redirectUrl: inviteUrl || `${process.env.FRONTEND_URL}/sign-in`,
    });

    // Create record in database with pending status
    const dbUser = await SuperAdminUser.create({
      clerkUserId: null, // Will be set when user accepts invite
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      email,
      status: 'pending',
    });

    return {
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.emailAddress,
      },
      user: dbUser,
      message: 'Invitation sent successfully',
    };
  } catch (error) {
    console.error('Error inviting superadmin user:', error);
    return {
      success: false,
      error: error.message || 'Failed to send invitation',
    };
  }
}

/**
 * Update a Super Admin user
 * @param {string} clerkUserId - Clerk User ID
 * @param {Object} updateData - Data to update
 * @param {string} updateData.firstName - First name (optional)
 * @param {string} updateData.lastName - Last name (optional)
 * @param {string} updateData.phone - Phone (optional)
 * @param {string} updateData.gender - Gender (optional)
 * @param {string} updateData.address - Address (optional)
 * @param {string} updateData.profileImage - Profile Image URL (optional)
 * @param {string} updateData.status - Status (optional)
 * @returns {Promise<Object>} Updated user
 */
export async function updateSuperAdminUser(clerkUserId, updateData) {
  try {
    const { firstName, lastName, phone, gender, address, profileImage, status } = updateData;

    // Update in Clerk (only basic profile fields, no metadata)
    const clerkUpdateData = {};
    if (firstName) clerkUpdateData.firstName = firstName;
    if (lastName) clerkUpdateData.lastName = lastName;

    if (Object.keys(clerkUpdateData).length > 0) {
      await clerk.users.updateUser(clerkUserId, clerkUpdateData);
    }

    // Update in database (all fields including phone, gender, etc.)
    const dbUpdateData = {};
    if (firstName) dbUpdateData.firstName = firstName;
    if (lastName) dbUpdateData.lastName = lastName;
    if (phone !== undefined) dbUpdateData.phone = phone;
    if (gender !== undefined) dbUpdateData.gender = gender;
    if (address !== undefined) dbUpdateData.address = address;
    if (profileImage !== undefined) dbUpdateData.profileImage = profileImage;
    if (status) dbUpdateData.status = status;

    const dbUser = await SuperAdminUser.findOneAndUpdate(
      { clerkUserId },
      dbUpdateData,
      { new: true }
    );

    if (!dbUser) {
      return {
        success: false,
        error: 'User not found in database',
      };
    }

    return {
      success: true,
      user: dbUser,
      message: 'User updated successfully',
    };
  } catch (error) {
    console.error('Error updating superadmin user:', error);
    return {
      success: false,
      error: error.message || 'Failed to update user',
    };
  }
}

/**
 * Delete a Super Admin user
 * @param {string} clerkUserId - Clerk User ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteSuperAdminUser(clerkUserId) {
  try {
    // Check if this is the last superadmin
    const activeCount = await SuperAdminUser.getActiveCount();
    if (activeCount <= 1) {
      return {
        success: false,
        error: 'Cannot delete the last active Super Admin',
      };
    }

    // Delete from Clerk
    await clerk.users.deleteUser(clerkUserId);

    // Soft delete from database
    const dbUser = await SuperAdminUser.findOne({ clerkUserId });
    if (dbUser) {
      await dbUser.softDelete();
    }

    return {
      success: true,
      message: 'User deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting superadmin user:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete user',
    };
  }
}

/**
 * Reset user password
 * @param {string} clerkUserId - Clerk User ID
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} Password reset result
 */
export async function resetUserPassword(clerkUserId, newPassword) {
  try {
    // Reset password in Clerk
    await clerk.users.updateUser(clerkUserId, {
      password: newPassword,
    });

    // Update password reset timestamp in database
    await SuperAdminUser.findOneAndUpdate(
      { clerkUserId },
      {
        passwordLastReset: new Date(),
        passwordResetToken: null,
        passwordResetExpires: null,
      }
    );

    return {
      success: true,
      message: 'Password reset successfully',
    };
  } catch (error) {
    console.error('Error resetting password:', error);
    return {
      success: false,
      error: error.message || 'Failed to reset password',
    };
  }
}

/**
 * Get all Super Admin users
 * @param {Object} filters - Query filters
 * @param {string} filters.status - Filter by status
 * @param {string} filters.search - Search term
 * @returns {Promise<Object>} List of users
 */
export async function getSuperAdminUsers(filters = {}) {
  try {
    const { status, search } = filters;

    const query = { isDeleted: false };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await SuperAdminUser.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return {
      success: true,
      users,
      total: users.length,
    };
  } catch (error) {
    console.error('Error fetching superadmin users:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch users',
    };
  }
}

/**
 * Get Super Admin user statistics
 * @returns {Promise<Object>} User statistics
 */
export async function getSuperAdminStats() {
  try {
    const total = await SuperAdminUser.countDocuments({ isDeleted: false });
    const active = await SuperAdminUser.countDocuments({ status: 'active', isDeleted: false });
    const inactive = await SuperAdminUser.countDocuments({ status: 'inactive', isDeleted: false });
    const pending = await SuperAdminUser.countDocuments({ status: 'pending', isDeleted: false });

    // Recently created (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentlyCreated = await SuperAdminUser.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
      isDeleted: false,
    });

    return {
      success: true,
      stats: {
        total,
        active,
        inactive,
        pending,
        recentlyCreated,
      },
    };
  } catch (error) {
    console.error('Error fetching superadmin stats:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch statistics',
    };
  }
}

/**
 * Check if email already exists
 * @param {string} email - Email to check
 * @returns {Promise<boolean>} True if email exists
 */
export async function checkEmailExists(email) {
  try {
    // Check in Clerk
    const userList = await clerk.users.getUserList({
      emailAddress: [email],
    });

    if (userList.totalCount > 0) {
      return true;
    }

    // Check in database
    const exists = await SuperAdminUser.emailExists(email);
    return exists;
  } catch (error) {
    console.error('Error checking email existence:', error);
    return false;
  }
}

export default {
  createSuperAdminUser,
  inviteSuperAdminUser,
  updateSuperAdminUser,
  deleteSuperAdminUser,
  resetUserPassword,
  getSuperAdminUsers,
  getSuperAdminStats,
  checkEmailExists,
  generatePassword,
};
