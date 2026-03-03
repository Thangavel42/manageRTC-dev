/**
 * Email Change Routes
 * Routes for handling employee email changes with OTP verification
 */

import express from 'express';
import Joi from 'joi';
import {
  sendCurrentEmailOTP,
  verifyCurrentEmailOTP,
  sendNewEmailOTP,
  updateEmail,
  checkEmailAvailability
} from '../../controllers/rest/emailChange.controller.js';
import {
  attachRequestId,
  authenticate
} from '../../middleware/auth.js';
import { requirePageAccess } from '../../middleware/pageAccess.js';
import {
  validateBody
} from '../../middleware/validate.js';

const router = express.Router();

// Apply request ID middleware to all routes
router.use(attachRequestId);

// Validation schemas (Joi format)
const sendOTPSchema = Joi.object({
  newEmail: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Invalid email format',
      'any.required': 'Email is required'
    })
});

const updateEmailSchema = Joi.object({
  newEmail: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Invalid email format',
      'any.required': 'Email is required'
    }),
  otp: Joi.string()
    .required()
    .messages({
      'any.required': 'OTP is required',
      'string.empty': 'OTP is required'
    })
});

const verifyOTPSchema = Joi.object({
  otp: Joi.string()
    .required()
    .messages({
      'any.required': 'OTP is required',
      'string.empty': 'OTP is required'
    })
});

/**
 * @route   POST /api/employees/:id/email/send-otp
 * @desc    Send OTP to current email for verification
 * @access  Private (Admin, HR, Superadmin, or own account)
 */
router.post(
  '/:id/email/send-otp',
  authenticate,
  sendCurrentEmailOTP
);

/**
 * @route   POST /api/employees/:id/email/verify-current
 * @desc    Verify OTP for current email
 * @access  Private (Admin, HR, Superadmin, or own account)
 */
router.post(
  '/:id/email/verify-current',
  authenticate,
  validateBody(verifyOTPSchema),
  verifyCurrentEmailOTP
);

/**
 * @route   POST /api/employees/:id/email/send-new-otp
 * @desc    Send OTP to new email address
 * @access  Private (Admin, HR, Superadmin, or own account)
 */
router.post(
  '/:id/email/send-new-otp',
  authenticate,
  validateBody(sendOTPSchema),
  sendNewEmailOTP
);

/**
 * @route   POST /api/employees/:id/email/update-email
 * @desc    Verify OTP for new email and update email in Clerk and database
 * @access  Private (Admin, HR, Superadmin, or own account)
 */
router.post(
  '/:id/email/update-email',
  authenticate,
  validateBody(updateEmailSchema),
  updateEmail
);

/**
 * @route   GET /api/employees/check-email
 * @desc    Check if email exists in Clerk or Database (real-time validation)
 * @access  Private
 */
router.get(
  '/check-email',
  authenticate,
  checkEmailAvailability
);

export default router;
