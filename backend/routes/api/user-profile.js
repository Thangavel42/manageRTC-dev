/**
 * User Profile API Routes
 * REST API endpoints for current user profile
 */

import express from 'express';
import {
  getCurrentUserProfile,
  updateCurrentUserProfile,
  changePassword,
  getAdminProfile,
  updateAdminProfile,
} from '../../controllers/rest/userProfile.controller.js';
import {
  authenticate,
  attachRequestId
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
  changePassword
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

export default router;
