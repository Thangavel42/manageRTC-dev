/**
 * Email Change Controller
 * Handles email change requests with OTP verification
 */

import { clerkClient } from '@clerk/clerk-sdk-node';
import { ObjectId } from 'mongodb';
import { client } from '../../config/db.js';
import { asyncHandler, buildNotFoundError, buildValidationError } from '../../middleware/errorHandler.js';
import otpService from '../../services/otp/otp.service.js';
import { extractUser, sendSuccess } from '../../utils/apiResponse.js';
import { sendEmployeeCredentialsEmail } from '../../utils/emailer.js';
import { devError, devLog } from '../../utils/logger.js';
import { generateSecurePassword } from '../rest/employee.controller.js';

/**
 * @desc    Send OTP to current email for verification
 * @route   POST /api/employees/:id/email/send-otp
 * @access  Private (Admin, HR, Superadmin, or own account)
 */
export const sendCurrentEmailOTP = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  devLog('[Email Change] sendCurrentEmailOTP - employeeId:', id, 'requestedBy:', user.userId);

  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid employee ID format');
  }

  const collections = user.companyId ? { employees: client.db(user.companyId).collection('employees') }
                                        : { employees: client.db('AmasQIS').collection('employees') };

  const employee = await collections.employees.findOne({ _id: new ObjectId(id) });

  if (!employee) {
    throw buildNotFoundError('Employee', id);
  }

  if (!employee.email) {
    throw buildValidationError('email', 'Employee does not have an email address');
  }

  // Send OTP to current email
  const result = await otpService.sendOTP(user.companyId, employee.email, 'email_change_verify_current');

  if (!result.success) {
    return res.status(500).json({
      success: false,
      error: {
        message: result.message || 'Failed to send OTP',
        code: 'OTP_SEND_FAILED'
      }
    });
  }

  return sendSuccess(res, { email: maskEmail(employee.email) }, result.message);
});

/**
 * @desc    Verify OTP for current email
 * @route   POST /api/employees/:id/email/verify-current
 * @access  Private (Admin, HR, Superadmin, or own account)
 */
export const verifyCurrentEmailOTP = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { otp } = req.body;
  const user = extractUser(req);

  devLog('[Email Change] verifyCurrentEmailOTP - employeeId:', id);

  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid employee ID format');
  }

  if (!otp || typeof otp !== 'string') {
    throw buildValidationError('otp', 'OTP is required');
  }

  const collections = user.companyId ? { employees: client.db(user.companyId).collection('employees') }
                                        : { employees: client.db('AmasQIS').collection('employees') };

  const employee = await collections.employees.findOne({ _id: new ObjectId(id) });

  if (!employee) {
    throw buildNotFoundError('Employee', id);
  }

  if (!employee.email) {
    throw buildValidationError('email', 'Employee does not have an email address');
  }

  // Verify OTP
  const result = await otpService.verifyOTP(user.companyId, employee.email, otp, 'email_change_verify_current');

  if (!result.valid) {
    return res.status(400).json({
      success: false,
      error: {
        message: result.message,
        code: 'INVALID_OTP'
      }
    });
  }

  return sendSuccess(res, { verified: true }, 'Current email verified successfully');
});

/**
 * @desc    Send OTP to new email address
 * @route   POST /api/employees/:id/email/send-new-otp
 * @access  Private (Admin, HR, Superadmin, or own account)
 */
export const sendNewEmailOTP = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newEmail } = req.body;
  const user = extractUser(req);

  devLog('[Email Change] sendNewEmailOTP - employeeId:', id, 'newEmail:', maskEmail(newEmail));

  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid employee ID format');
  }

  if (!newEmail || typeof newEmail !== 'string') {
    throw buildValidationError('newEmail', 'New email is required');
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    throw buildValidationError('newEmail', 'Invalid email format');
  }

  const collections = user.companyId ? { employees: client.db(user.companyId).collection('employees') }
                                        : { employees: client.db('AmasQIS').collection('employees') };

  const employee = await collections.employees.findOne({ _id: new ObjectId(id) });

  if (!employee) {
    throw buildNotFoundError('Employee', id);
  }

  // Check if new email is same as current email
  if (employee.email.toLowerCase() === newEmail.toLowerCase()) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'New email cannot be the same as current email',
        code: 'SAME_EMAIL'
      }
    });
  }

  // Check if new email already exists
  const existingEmployee = await collections.employees.findOne({
    email: { $regex: `^${newEmail.toLowerCase()}$`, $options: 'i' },
    _id: { $ne: new ObjectId(id) }
  });

  if (existingEmployee) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'This email address is already registered',
        code: 'EMAIL_EXISTS'
      }
    });
  }

  // Send OTP to new email
  const result = await otpService.sendOTP(user.companyId, newEmail.toLowerCase(), 'email_change_verify_new');

  if (!result.success) {
    return res.status(500).json({
      success: false,
      error: {
        message: result.message || 'Failed to send OTP',
        code: 'OTP_SEND_FAILED'
      }
    });
  }

  return sendSuccess(res, { email: maskEmail(newEmail) }, result.message);
});

/**
 * @desc    Verify OTP for new email and update email in Clerk and database
 * @route   POST /api/employees/:id/email/update-email
 * @access  Private (Admin, HR, Superadmin, or own account)
 */
export const updateEmail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newEmail, otp } = req.body;
  const user = extractUser(req);

  devLog('[Email Change] updateEmail - employeeId:', id, 'newEmail:', maskEmail(newEmail));

  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid employee ID format');
  }

  if (!newEmail || typeof newEmail !== 'string') {
    throw buildValidationError('newEmail', 'New email is required');
  }

  if (!otp || typeof otp !== 'string') {
    throw buildValidationError('otp', 'OTP is required');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    throw buildValidationError('newEmail', 'Invalid email format');
  }

  const collections = user.companyId ? { employees: client.db(user.companyId).collection('employees') }
                                        : { employees: client.db('AmasQIS').collection('employees') };

  const employee = await collections.employees.findOne({ _id: new ObjectId(id) });

  if (!employee) {
    throw buildNotFoundError('Employee', id);
  }

  // Verify OTP for new email
  const otpResult = await otpService.verifyOTP(user.companyId, newEmail.toLowerCase(), otp, 'email_change_verify_new');

  if (!otpResult.valid) {
    return res.status(400).json({
      success: false,
      error: {
        message: otpResult.message,
        code: 'INVALID_OTP'
      }
    });
  }

  const normalizedNewEmail = newEmail.toLowerCase().trim();
  const currentEmail = employee.email;

  devLog('[Email Change] Starting email change process');
  devLog('[Email Change] Step 0/5: From', maskEmail(currentEmail), 'to', maskEmail(normalizedNewEmail));

  try {
    let clerkUserId = employee.clerkUserId;
    let newPassword = null;
    const steps = {
      currentStep: 0,
      totalSteps: 5,
      stepsCompleted: [],
      errors: []
    };

    // Step 1: Get old user metadata (if clerkUserId exists)
    steps.currentStep = 1;
    devLog('[Email Change] Step 1/5: Fetching current Clerk user metadata...');

    let metadata = { companyId: user.companyId, role: employee.role || 'employee' };

    if (clerkUserId) {
      try {
        const oldUser = await clerkClient.users.getUser(clerkUserId);
        metadata = oldUser.publicMetadata || metadata;
        metadata.companyId = metadata.companyId || user.companyId;
        steps.stepsCompleted.push('fetch_metadata');
        devLog('[Email Change] Step 1/5: ✅ Metadata fetched successfully');
      } catch (err) {
        devError('[Email Change] Step 1/5: ⚠ Could not fetch old user, using default metadata');
        steps.errors.push('Could not fetch old user metadata');
      }
    } else {
      devLog('[Email Change] Step 1/5: ⚠ No existing clerkUserId, will create new user');
    }

    // Step 2: Delete old Clerk user (if exists)
    steps.currentStep = 2;
    devLog('[Email Change] Step 2/5: Deleting old Clerk user...');

    if (clerkUserId) {
      try {
        await clerkClient.users.deleteUser(clerkUserId);
        steps.stepsCompleted.push('delete_old_user');
        devLog('[Email Change] Step 2/5: ✅ Old Clerk user deleted successfully');
      } catch (deleteErr) {
        devError('[Email Change] Step 2/5: ⚠ Failed to delete old user:', deleteErr.message);
        steps.errors.push(`Failed to delete old user: ${deleteErr.message}`);
        // Continue anyway - user might not exist
      }
    } else {
      devLog('[Email Change] Step 2/5: ⊘ No old user to delete');
    }

    // Step 3: Generate new password
    steps.currentStep = 3;
    devLog('[Email Change] Step 3/5: Generating new secure password...');

    newPassword = generateSecurePassword();
    steps.stepsCompleted.push('generate_password');
    devLog('[Email Change] Step 3/5: ✅ New password generated');

    // Step 4: Create new Clerk user with new email
    steps.currentStep = 4;
    devLog('[Email Change] Step 4/5: Creating new Clerk user with email:', maskEmail(normalizedNewEmail));

    try {
      const newUser = await clerkClient.users.createUser({
        emailAddress: [normalizedNewEmail],
        password: newPassword,
        publicMetadata: metadata
      });

      clerkUserId = newUser.id;
      steps.stepsCompleted.push('create_new_user');
      devLog('[Email Change] Step 4/5: ✅ New Clerk user created:', clerkUserId);
      devLog('[Email Change] New user details:', {
        id: newUser.id,
        email: normalizedNewEmail,
        metadata: metadata
      });
    } catch (createErr) {
      devError('[Email Change] Step 4/5: ❌ Failed to create new Clerk user:', createErr.message);
      devError('[Email Change] Clerk error details:', JSON.stringify(createErr, null, 2));

      // Check if it's a duplicate email error
      const errorMsg = createErr.message || '';
      if (errorMsg.includes('duplicate') || errorMsg.includes('already exists') || errorMsg.includes('taken')) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'This email address is already registered in Clerk. Please use a different email.',
            code: 'EMAIL_EXISTS_IN_CLERK',
            details: errorMsg
          }
        });
      }

      throw new Error(`Failed to create Clerk user: ${createErr.message}`);
    }

    // Step 5: Send welcome email with new credentials
    steps.currentStep = 5;
    devLog('[Email Change] Step 5/5: Sending welcome email to:', maskEmail(normalizedNewEmail));

    try {
      await sendEmployeeCredentialsEmail({
        to: normalizedNewEmail,
        companyName: employee.companyName || metadata.companyName || 'ManageRTC',
        password: newPassword,
        firstName: employee.firstName,
        lastName: employee.lastName,
        loginLink: process.env.FRONTEND_URL || 'http://localhost:3000'
      });
      steps.stepsCompleted.push('send_welcome_email');
      devLog('[Email Change] Step 5/5: ✅ Welcome email sent successfully');
    } catch (emailErr) {
      devError('[Email Change] Step 5/5: ⚠ Failed to send welcome email:', emailErr.message);
      steps.errors.push(`Email sending failed: ${emailErr.message}`);
      // Don't fail the process if email fails - user can still log in
    }

    // Update employee in database
    devLog('[Email Change] Updating employee in database...');

    const updateData = {
      email: normalizedNewEmail,
      clerkUserId: clerkUserId,
      updatedAt: new Date(),
      updatedBy: user.userId
    };

    // Store new password in account.password
    if (newPassword) {
      updateData.account = {
        ...(employee.account || {}),
        password: newPassword,
        username: normalizedNewEmail
      };
      devLog('[Email Change] New password stored in account.password');
    }

    const result = await collections.employees.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      throw new Error('Failed to update employee');
    }

    devLog('[Email Change] ✅ ALL STEPS COMPLETED SUCCESSFULLY');
    devLog('[Email Change] Final state:', {
      oldEmail: maskEmail(currentEmail),
      newEmail: maskEmail(normalizedNewEmail),
      oldClerkUserId: employee.clerkUserId,
      newClerkUserId: clerkUserId,
      passwordReset: true,
      steps: steps
    });

    return sendSuccess(res, {
      email: normalizedNewEmail,
      passwordReset: true,
      message: 'Email updated successfully. New password has been sent to the new email address.',
      steps: steps
    }, 'Email address updated successfully');

  } catch (error) {
    devError('[Email Change] Error updating email:', error);

    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update email. Please try again.',
        code: 'EMAIL_UPDATE_FAILED',
        details: error.message
      }
    });
  }
});

/**
 * @desc    Check if email exists in Clerk or Database
 * @route   GET /api/employees/check-email?email=xxx&employeeId=xxx
 * @access  Private
 */
export const checkEmailAvailability = asyncHandler(async (req, res) => {
  const { email, employeeId } = req.query;
  const user = extractUser(req);

  devLog('[Email Change] checkEmailAvailability - email:', email, 'employeeId:', employeeId);

  if (!email || typeof email !== 'string') {
    throw buildValidationError('email', 'Email is required');
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return sendSuccess(res, {
      available: false,
      valid: false,
      message: 'Invalid email format'
    });
  }

  // Check database first (faster)
  const collections = user.companyId
    ? { employees: client.db(user.companyId).collection('employees') }
    : { employees: client.db('AmasQIS').collection('employees') };

  // Build query - exclude current employee
  const query = {
    email: { $regex: `^${normalizedEmail}$`, $options: 'i' }
  };

  // If employeeId provided, exclude that employee from the check
  if (employeeId && ObjectId.isValid(employeeId)) {
    query._id = { $ne: new ObjectId(employeeId) };
  }

  const existingEmployee = await collections.employees.findOne(query);

  if (existingEmployee) {
    devLog('[Email Change] Email exists in database');
    return sendSuccess(res, {
      available: false,
      valid: true,
      message: 'This email is already registered in the system',
      source: 'database'
    });
  }

  // Check Clerk
  try {
    const userList = await clerkClient.users.getUserList({
      emailAddress: [normalizedEmail]
    });

    const emailExistsInClerk = userList && userList.data && userList.data.length > 0;

    if (emailExistsInClerk) {
      devLog('[Email Change] Email exists in Clerk');
      return sendSuccess(res, {
        available: false,
        valid: true,
        message: 'This email is already registered',
        source: 'clerk'
      });
    }

    devLog('[Email Change] Email is available');
    return sendSuccess(res, {
      available: true,
      valid: true,
      message: 'Email is available',
      source: 'both'
    });
  } catch (clerkError) {
    // If Clerk returns an error about user not found, email is available
    if (clerkError?.status === 404 || clerkError?.clerkError?.status === 404) {
      devLog('[Email Change] Email not found in Clerk (available)');
      return sendSuccess(res, {
        available: true,
        valid: true,
        message: 'Email is available',
        source: 'both'
      });
    }

    devError('[Email Change] Clerk API error:', clerkError);
    // On error, allow proceeding (don't block user) but show warning
    return sendSuccess(res, {
      available: true,
      valid: true,
      message: 'Email is available',
      warning: 'Could not verify with Clerk, but database check passed',
      source: 'database-only'
    });
  }
});

/**
 * Helper function to mask email for privacy
 */
function maskEmail(email) {
  if (!email) return '';
  const [username, domain] = email.split('@');
  if (!domain) return email;
  const maskedUsername = username.length > 2
    ? username.substring(0, 2) + '***'
    : username;
  return `${maskedUsername}@${domain}`;
}

export default {
  sendCurrentEmailOTP,
  verifyCurrentEmailOTP,
  sendNewEmailOTP,
  updateEmail,
  checkEmailAvailability
};
