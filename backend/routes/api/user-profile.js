/**
 * User Profile API Routes
 * REST API endpoints for current user profile
 */

import express from 'express';
import {
  getCurrentUserProfile,
  updateCurrentUserProfile,
  changePassword,
  sendForgotPasswordOTP,
  resetForgotPassword,
  getAdminProfile,
  updateAdminProfile,
  // Phase 2: Extended Profile Endpoints
  getWorkInfo,
  getSalaryInfo,
  getStatutoryInfo,
  getMyAssets,
  getCareerHistory,
} from '../../controllers/rest/userProfile.controller.js';
import {
  authenticate,
  attachRequestId,
  requireEmployeeActive,
  requireOwnEmployee  // ✅ SECURITY FIX: Prevent IDOR
} from '../../middleware/auth.js';
import { sanitizeBody } from '../../middleware/inputSanitization.js';  // ✅ SECURITY FIX: Prevent mass assignment
import { authLimiter, passwordResetLimiter } from '../../middleware/rateLimiting.js';  // ✅ SECURITY FIX - Phase 2: Rate limiting

const router = express.Router();

// Apply request ID middleware to all routes
router.use(attachRequestId);

/**
 * @route   GET /api/user-profile/current
 * @desc    Get current user profile (role-based data)
 * @access  Private (All authenticated users)
 * @security IDOR prevention via requireOwnEmployee
 */
router.get(
  '/current',
  authenticate,
  requireOwnEmployee,  // ✅ SECURITY FIX: Verify user can only access own profile
  getCurrentUserProfile
);

/**
 * @route   PUT /api/user-profile/current
 * @desc    Update current user profile
 * @access  Private (Admin, HR, Employee)
 * @security IDOR prevention via requireOwnEmployee, Mass assignment prevention via sanitizeBody
 */
router.put(
  '/current',
  authenticate,
  requireOwnEmployee,  // ✅ SECURITY FIX: Verify user can only update own profile
  sanitizeBody,        // ✅ SECURITY FIX: Remove MongoDB operators from body
  updateCurrentUserProfile
);

/**
 * @route   POST /api/user-profile/change-password
 * @desc    Change password for current user
 * @access  Private (All authenticated users)
 * @security IDOR prevention via requireOwnEmployee, Rate limiting via authLimiter
 */
router.post(
  '/change-password',
  authLimiter,         // ✅ SECURITY FIX - Phase 2: 5 attempts per 15 minutes
  authenticate,
  requireOwnEmployee,  // ✅ SECURITY FIX: Verify user can only change own password
  sanitizeBody,        // ✅ SECURITY FIX: Sanitize request body
  changePassword
);

/**
 * @route   POST /api/user-profile/forgot-password/send-otp
 * @desc    Send OTP to registered email for password reset
 * @access  Private (All authenticated users)
 * @security Rate limiting via passwordResetLimiter (3 attempts per hour)
 */
router.post(
  '/forgot-password/send-otp',
  passwordResetLimiter,  // ✅ SECURITY FIX - Phase 2: 3 attempts per hour
  authenticate,
  requireEmployeeActive,
  sendForgotPasswordOTP
);

/**
 * @route   POST /api/user-profile/forgot-password/reset
 * @desc    Reset password using OTP (no current password required)
 * @access  Private (All authenticated users)
 * @security Rate limiting via passwordResetLimiter (3 attempts per hour)
 */
router.post(
  '/forgot-password/reset',
  passwordResetLimiter,  // ✅ SECURITY FIX - Phase 2: 3 attempts per hour
  authenticate,
  requireEmployeeActive,
  resetForgotPassword
);

/**
 * @route   GET /api/user-profile/admin
 * @desc    Get admin profile (company information)
 * @access  Private (Admin only)
 */
router.get(
  '/admin',
  authenticate,
  getAdminProfile
);

/**
 * @route   PUT /api/user-profile/admin
 * @desc    Update admin profile (company information)
 * @access  Private (Admin only)
 */
router.put(
  '/admin',
  authenticate,
  updateAdminProfile
);

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2: Extended Profile Endpoints (Read-Only Sections)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/user-profile/work-info
 * @desc    Get work info (shift, batch, timezone, employment type)
 * @access  Private (All authenticated users)
 * @security IDOR prevention via requireOwnEmployee
 */
router.get('/work-info', authenticate, requireOwnEmployee, getWorkInfo);

/**
 * @route   GET /api/user-profile/salary
 * @desc    Get salary info (basic, HRA, allowances, total CTC, currency)
 * @access  Private (All authenticated users)
 * @security IDOR prevention via requireOwnEmployee
 */
router.get('/salary', authenticate, requireOwnEmployee, getSalaryInfo);

/**
 * @route   GET /api/user-profile/statutory
 * @desc    Get statutory info (PF, ESI contributions from latest payslip)
 * @access  Private (All authenticated users)
 * @security IDOR prevention via requireOwnEmployee
 */
router.get('/statutory', authenticate, requireOwnEmployee, getStatutoryInfo);

/**
 * @route   GET /api/user-profile/assets
 * @desc    Get assigned assets for current employee
 * @access  Private (All authenticated users)
 * @security IDOR prevention via requireOwnEmployee
 */
router.get('/assets', authenticate, requireOwnEmployee, getMyAssets);

/**
 * @route   GET /api/user-profile/career
 * @desc    Get career history (promotions, policies, resignation, termination)
 * @access  Private (All authenticated users)
 * @security IDOR prevention via requireOwnEmployee
 */
router.get('/career', authenticate, requireOwnEmployee, getCareerHistory);

export default router;
