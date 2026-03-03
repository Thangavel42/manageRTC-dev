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
  requireEmployeeActive
} from '../../middleware/auth.js';

const router = express.Router();

// Apply request ID middleware to all routes
router.use(attachRequestId);

/**
 * @route   GET /api/user-profile/current
 * @desc    Get current user profile (role-based data)
 * @access  Private (All authenticated users)
 */
router.get(
  '/current',
  authenticate,
  getCurrentUserProfile
);

/**
 * @route   PUT /api/user-profile/current
 * @desc    Update current user profile
 * @access  Private (Admin, HR, Employee)
 */
router.put(
  '/current',
  authenticate,
  requireEmployeeActive,
  updateCurrentUserProfile
);

/**
 * @route   POST /api/user-profile/change-password
 * @desc    Change password for current user
 * @access  Private (All authenticated users)
 */
router.post(
  '/change-password',
  authenticate,
  requireEmployeeActive,
  changePassword
);

/**
 * @route   POST /api/user-profile/forgot-password/send-otp
 * @desc    Send OTP to registered email for password reset
 * @access  Private (All authenticated users)
 */
router.post('/forgot-password/send-otp', authenticate, requireEmployeeActive, sendForgotPasswordOTP);

/**
 * @route   POST /api/user-profile/forgot-password/reset
 * @desc    Reset password using OTP (no current password required)
 * @access  Private (All authenticated users)
 */
router.post('/forgot-password/reset', authenticate, requireEmployeeActive, resetForgotPassword);

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
 */
router.get('/work-info', authenticate, requireEmployeeActive, getWorkInfo);

/**
 * @route   GET /api/user-profile/salary
 * @desc    Get salary info (basic, HRA, allowances, total CTC, currency)
 * @access  Private (All authenticated users)
 */
router.get('/salary', authenticate, requireEmployeeActive, getSalaryInfo);

/**
 * @route   GET /api/user-profile/statutory
 * @desc    Get statutory info (PF, ESI contributions from latest payslip)
 * @access  Private (All authenticated users)
 */
router.get('/statutory', authenticate, requireEmployeeActive, getStatutoryInfo);

/**
 * @route   GET /api/user-profile/assets
 * @desc    Get assigned assets for current employee
 * @access  Private (All authenticated users)
 */
router.get('/assets', authenticate, requireEmployeeActive, getMyAssets);

/**
 * @route   GET /api/user-profile/career
 * @desc    Get career history (promotions, policies, resignation, termination)
 * @access  Private (All authenticated users)
 */
router.get('/career', authenticate, requireEmployeeActive, getCareerHistory);

export default router;
