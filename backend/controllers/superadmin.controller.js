/**
 * Super Admin Controller
 * Handles HTTP requests for Super Admin user management
 */

import clerkAdminService from '../services/clerkAdmin.service.js';
import SuperAdminUser from '../models/superadminUser.schema.js';
import { sendSuperAdminEmail } from '../services/email.service.js';
import auditService from '../services/audit.service.js';

/**
 * Get all Super Admin users
 * @route GET /api/superadmin/users
 */
export async function getAllSuperAdmins(req, res) {
  try {
    const { status, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const result = await clerkAdminService.getSuperAdminUsers({
      status,
      search,
      sortBy,
      sortOrder,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { message: result.error },
      });
    }

    return res.json({
      success: true,
      data: result.users,
      total: result.total,
    });
  } catch (error) {
    console.error('Error in getAllSuperAdmins:', error);
    return res.status(500).json({
      success: false,
      error: { message: error.message },
    });
  }
}

/**
 * Get Super Admin statistics
 * @route GET /api/superadmin/users/stats
 */
export async function getSuperAdminStats(req, res) {
  try {
    const result = await clerkAdminService.getSuperAdminStats();

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { message: result.error },
      });
    }

    return res.json({
      success: true,
      data: result.stats,
    });
  } catch (error) {
    console.error('Error in getSuperAdminStats:', error);
    return res.status(500).json({
      success: false,
      error: { message: error.message },
    });
  }
}

/**
 * Get a single Super Admin user by ID
 * @route GET /api/superadmin/users/:id
 */
export async function getSuperAdminById(req, res) {
  try {
    const { id } = req.params;

    const user = await SuperAdminUser.findOne({
      _id: id,
      isDeleted: false,
    }).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'Super Admin not found' },
      });
    }

    return res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Error in getSuperAdminById:', error);
    return res.status(500).json({
      success: false,
      error: { message: error.message },
    });
  }
}

/**
 * Create a new Super Admin user
 * @route POST /api/superadmin/users
 */
export async function createSuperAdmin(req, res) {
  try {
    const userId = req.user?.id;
    const userData = req.body;

    // Validate required fields
    const { firstName, lastName, email, phone, gender } = userData;
    if (!firstName || !lastName || !email || !phone || !gender) {
      return res.status(400).json({
        success: false,
        error: { message: 'First name, last name, email, phone number, and gender are required' },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid email format' },
      });
    }

    // Validate phone format
    const phoneRegex = /^[\d\s\-+()]+$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid phone number format' },
      });
    }

    // Validate gender
    const validGenders = ['male', 'female', 'other', 'prefer_not_to_say'];
    if (!validGenders.includes(gender)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid gender value' },
      });
    }

    // Check if email already exists
    const emailExists = await clerkAdminService.checkEmailExists(email);
    if (emailExists) {
      return res.status(400).json({
        success: false,
        error: { message: 'Email already exists' },
      });
    }

    // Get creator info
    const creator = await SuperAdminUser.findOne({ clerkUserId: userId }).lean();
    const creatorName = creator ? creator.fullName : 'System';

    // Set creator info
    userData.createdBy = creator?._id || null;
    userData.creatorName = creatorName;

    // Create user in Clerk and database
    const result = await clerkAdminService.createSuperAdminUser(userData);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { message: result.error },
      });
    }

    // Send email with credentials if requested
    if (userData.sendEmail !== false) {
      try {
        await sendSuperAdminEmail({
          to: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          email: result.user.email,
          password: result.password,
          loginUrl: `${process.env.FRONTEND_URL}/sign-in`,
          type: 'create',
        });
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Continue even if email fails
      }
    }

    // Log the creation
    await auditService.logCreate({
      entityType: 'superadmin',
      entity: result.user,
      req,
      metadata: {
        emailSent: userData.sendEmail !== false,
        clerkUserId: result.clerkUser?.id,
      },
    });

    return res.status(201).json({
      success: true,
      data: result.user,
      message: result.message,
      metadata: {
        clerkUserId: result.clerkUser?.id,
        requireReauth: true,
        note: 'User must sign out and sign back in to see all Super Admin menu items',
        instructions: [
          '1. User will receive email with credentials',
          '2. User signs in for the first time',
          '3. User should sign out and sign back in to refresh metadata',
          '4. Use "Refresh Metadata" button if menu items are still missing',
        ],
      },
    });
  } catch (error) {
    console.error('Error in createSuperAdmin:', error);

    // Log the error
    await auditService.logAction({
      entityType: 'superadmin',
      action: 'create',
      req,
      status: 'failure',
      errorMessage: error.message,
      metadata: { userData: req.body },
    });

    return res.status(500).json({
      success: false,
      error: { message: error.message },
    });
  }
}

/**
 * Update a Super Admin user
 * @route PUT /api/superadmin/users/:id
 */
export async function updateSuperAdmin(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const updateData = req.body;

    // Find user in database
    const user = await SuperAdminUser.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'Super Admin not found' },
      });
    }

    // Get updater info
    const updater = await SuperAdminUser.findOne({ clerkUserId: userId }).lean();
    const updaterName = updater ? updater.fullName : 'System';

    // Set updater info
    updateData.updatedBy = updater?._id || null;
    updateData.updaterName = updaterName;

    // Validate phone format if provided
    if (updateData.phone) {
      const phoneRegex = /^[\d\s\-+()]+$/;
      if (!phoneRegex.test(updateData.phone)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid phone number format' },
        });
      }
    }

    // Validate gender if provided
    if (updateData.gender) {
      const validGenders = ['male', 'female', 'other', 'prefer_not_to_say'];
      if (!validGenders.includes(updateData.gender)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid gender value' },
        });
      }
    }

    // If email is being changed, validate it
    if (updateData.email && updateData.email !== user.email) {
      const emailExists = await clerkAdminService.checkEmailExists(updateData.email);
      if (emailExists) {
        return res.status(400).json({
          success: false,
          error: { message: 'Email already exists' },
        });
      }
    }

    // Store old values for audit log
    const oldValues = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      gender: user.gender,
      status: user.status,
      address: user.address,
      profileImage: user.profileImage,
    };

    // Update in Clerk and database
    const result = await clerkAdminService.updateSuperAdminUser(
      user.clerkUserId,
      updateData
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { message: result.error },
      });
    }

    // Log the update
    await auditService.logUpdate({
      entityType: 'superadmin',
      entityId: user._id,
      entityName: user.fullName || user.email,
      before: oldValues,
      after: result.user,
      req,
    });

    return res.json({
      success: true,
      data: result.user,
      message: 'Super Admin updated successfully',
    });
  } catch (error) {
    console.error('Error in updateSuperAdmin:', error);

    // Log the error
    await auditService.logAction({
      entityType: 'superadmin',
      entityId: req.params.id,
      action: 'update',
      req,
      status: 'failure',
      errorMessage: error.message,
    });

    return res.status(500).json({
      success: false,
      error: { message: error.message },
    });
  }
}

/**
 * Delete a Super Admin user
 * @route DELETE /api/superadmin/users/:id
 */
export async function deleteSuperAdmin(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Find user in database
    const user = await SuperAdminUser.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'Super Admin not found' },
      });
    }

    // Prevent deleting yourself
    const currentUser = await SuperAdminUser.findOne({ clerkUserId: userId });
    if (currentUser._id.toString() === user._id.toString()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot delete your own account' },
      });
    }

    // Delete from Clerk and database
    const result = await clerkAdminService.deleteSuperAdminUser(user.clerkUserId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { message: result.error },
      });
    }

    // Log the deletion
    await auditService.logDelete({
      entityType: 'superadmin',
      entityId: user._id,
      entityName: user.fullName || user.email,
      before: user,
      req,
    });

    return res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('Error in deleteSuperAdmin:', error);

    // Log the error
    await auditService.logAction({
      entityType: 'superadmin',
      entityId: req.params.id,
      action: 'delete',
      req,
      status: 'failure',
      errorMessage: error.message,
    });

    return res.status(500).json({
      success: false,
      error: { message: error.message },
    });
  }
}

/**
 * Reset Super Admin password
 * @route POST /api/superadmin/users/:id/reset-password
 */
export async function resetSuperAdminPassword(req, res) {
  try {
    const { id } = req.params;
    const { password, sendEmail = true } = req.body;

    // Validate password
    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        error: { message: 'Password must be at least 8 characters long' },
      });
    }

    // Find user in database
    const user = await SuperAdminUser.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'Super Admin not found' },
      });
    }

    // Reset password in Clerk
    const result = await clerkAdminService.resetUserPassword(user.clerkUserId, password);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { message: result.error },
      });
    }

    // Send email notification if requested
    if (sendEmail) {
      try {
        await sendSuperAdminEmail({
          to: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          password: password,
          loginUrl: `${process.env.FRONTEND_URL}/sign-in`,
          type: 'password-reset',
        });
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Continue even if email fails
      }
    }

    // Log the password reset
    await auditService.logPasswordReset({
      entityType: 'superadmin',
      entityId: user._id,
      entityName: user.fullName || user.email,
      req,
      metadata: {
        emailSent: sendEmail,
        resetBy: userId,
      },
    });

    return res.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Error in resetSuperAdminPassword:', error);

    // Log the error
    await auditService.logAction({
      entityType: 'superadmin',
      entityId: req.params.id,
      action: 'password_reset',
      req,
      status: 'failure',
      errorMessage: error.message,
    });

    return res.status(500).json({
      success: false,
      error: { message: error.message },
    });
  }
}

/**
 * Toggle Super Admin status
 * @route PATCH /api/superadmin/users/:id/toggle-status
 */
export async function toggleSuperAdminStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid status value' },
      });
    }

    // Find user in database
    const user = await SuperAdminUser.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'Super Admin not found' },
      });
    }

    const oldStatus = user.status;

    // Prevent deactivating yourself
    const userId = req.user?.id;
    const currentUser = await SuperAdminUser.findOne({ clerkUserId: userId });
    if (currentUser._id.toString() === user._id.toString() && status !== 'active') {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot deactivate your own account' },
      });
    }

    // Update status in database
    user.status = status;
    await user.save();

    // Log the status change
    await auditService.logStatusChange({
      entityType: 'superadmin',
      entityId: user._id,
      entityName: user.fullName || user.email,
      oldStatus,
      newStatus: status,
      req,
    });

    return res.json({
      success: true,
      data: user,
      message: `User ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    console.error('Error in toggleSuperAdminStatus:', error);

    // Log the error
    await auditService.logAction({
      entityType: 'superadmin',
      entityId: req.params.id,
      action: 'status_change',
      req,
      status: 'failure',
      errorMessage: error.message,
    });

    return res.status(500).json({
      success: false,
      error: { message: error.message },
    });
  }
}

/**
 * Resend invitation email
 * @route POST /api/superadmin/users/:id/resend-invite
 */
export async function resendInvite(req, res) {
  try {
    const { id } = req.params;

    // Find user in database
    const user = await SuperAdminUser.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'Super Admin not found' },
      });
    }

    // Generate new password
    const newPassword = clerkAdminService.generatePassword(16);

    // Update password in Clerk
    const resetResult = await clerkAdminService.resetUserPassword(
      user.clerkUserId,
      newPassword
    );

    if (!resetResult.success) {
      return res.status(400).json({
        success: false,
        error: { message: resetResult.error },
      });
    }

    // Send email
    try {
      await sendSuperAdminEmail({
        to: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: newPassword,
        loginUrl: `${process.env.FRONTEND_URL}/sign-in`,
        type: 'resend-credentials',
      });

      // Update last invite sent timestamp
      user.lastInviteSent = new Date();
      await user.save();

      // Log the resend action
      await auditService.logAction({
        entityType: 'superadmin',
        entityId: user._id,
        entityName: user.fullName || user.email,
        action: 'other',
        req,
        metadata: {
          actionType: 'resend_invite',
          emailSent: true,
        },
      });

      return res.json({
        success: true,
        message: 'Invitation resent successfully',
      });
    } catch (emailError) {
      console.error('Error sending email:', emailError);

      // Log the error
      await auditService.logAction({
        entityType: 'superadmin',
        entityId: req.params.id,
        action: 'other',
        req,
        status: 'failure',
        errorMessage: 'Failed to send email',
        metadata: { actionType: 'resend_invite' },
      });

      return res.status(500).json({
        success: false,
        error: { message: 'Failed to send email' },
      });
    }
  } catch (error) {
    console.error('Error in resendInvite:', error);

    // Log the error
    await auditService.logAction({
      entityType: 'superadmin',
      entityId: req.params.id,
      action: 'other',
      req,
      status: 'failure',
      errorMessage: error.message,
      metadata: { actionType: 'resend_invite' },
    });

    return res.status(500).json({
      success: false,
      error: { message: error.message },
    });
  }
}

/**
 * Refresh User Metadata from Clerk
 * Updates user metadata by fetching latest from Clerk
 * @route POST /api/superadmin/users/:id/refresh-metadata
 */
export async function refreshUserMetadata(req, res) {
  try {
    const { id } = req.params;

    // Find user in database
    const user = await SuperAdminUser.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'Super Admin not found' },
      });
    }

    // Import clerk client
    const { createClerkClient } = await import('@clerk/backend');
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

    // Fetch user from Clerk
    const clerkUser = await clerk.users.getUser(user.clerkUserId);
    const currentRole = clerkUser.publicMetadata?.role;

    console.log('[refreshUserMetadata] Current Clerk metadata:', {
      clerkUserId: user.clerkUserId,
      currentRole,
      publicMetadata: clerkUser.publicMetadata,
    });

    // If role is not 'superadmin', update it
    if (currentRole !== 'superadmin') {
      console.log('[refreshUserMetadata] Updating role to superadmin...');
      await clerk.users.updateUser(user.clerkUserId, {
        publicMetadata: {
          role: 'superadmin',
        },
      });

      // Verify update
      const updatedUser = await clerk.users.getUser(user.clerkUserId);
      console.log('[refreshUserMetadata] Updated metadata:', {
        newRole: updatedUser.publicMetadata?.role,
      });
    }

    // Log the action
    await auditService.logAction({
      entityType: 'superadmin',
      entityId: user._id,
      entityName: user.fullName || user.email,
      action: 'other',
      req,
      status: 'success',
      metadata: {
        actionType: 'refresh_metadata',
        roleBefore: currentRole,
        roleAfter: 'superadmin',
      },
    });

    return res.json({
      success: true,
      message: 'User metadata refreshed successfully',
      data: {
        currentRole,
        expectedRole: 'superadmin',
        wasUpdated: currentRole !== 'superadmin',
        note: currentRole === 'superadmin'
          ? 'Role was already set correctly'
          : 'Role has been updated. User should sign out and sign back in.',
      },
    });
  } catch (error) {
    console.error('Error in refreshUserMetadata:', error);

    return res.status(500).json({
      success: false,
      error: { message: error.message },
    });
  }
}

export default {
  getAllSuperAdmins,
  getSuperAdminStats,
  getSuperAdminById,
  createSuperAdmin,
  updateSuperAdmin,
  deleteSuperAdmin,
  resetSuperAdminPassword,
  toggleSuperAdminStatus,
  resendInvite,
  refreshUserMetadata,
};
