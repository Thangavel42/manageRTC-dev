/**
 * Admin Users API Routes
 * REST API endpoints for admin user management
 */

import express from 'express';
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserById,
} from '../../controllers/rest/admin.users.controller.js';
import { authenticate, attachRequestId } from '../../middleware/auth.js';

const router = express.Router();

// Apply request ID middleware to all routes
router.use(attachRequestId);

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users (employees and clients combined)
 * @access  Private (Admin)
 */
router.get('/', getAllUsers);

/**
 * @route   POST /api/admin/users
 * @desc    Create a new user
 * @access  Private (Admin)
 */
router.post('/', createUser);

/**
 * @route   GET /api/admin/users/:userId
 * @desc    Get user by ID
 * @access  Private (Admin)
 */
router.get('/:userId', getUserById);

/**
 * @route   PUT /api/admin/users/:userId
 * @desc    Update an existing user
 * @access  Private (Admin)
 */
router.put('/:userId', updateUser);

/**
 * @route   DELETE /api/admin/users/:userId
 * @desc    Delete a user
 * @access  Private (Admin)
 */
router.delete('/:userId', deleteUser);

export default router;
