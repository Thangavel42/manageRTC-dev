/**
 * Admin Users Controller
 * REST API endpoints for admin user management
 */

import {
    createUser as createUserService,
    deleteUser as deleteUserService,
    getAllUsers as getAllUsersService,
    getUserById as getUserByIdService,
    updateUser as updateUserService
} from '../../services/admin/admin.services.js';

/**
 * Get all users (employees and clients combined)
 * @route   GET /api/admin/users
 * @access  Private (Admin)
 */
export async function getAllUsers(req, res) {
  try {
    const { role, status, sortBy, dateRange } = req.query;
    const filters = { role, status, sortBy, dateRange };

    // Get companyId from authenticated user (via auth middleware)
    const companyId = req.user?.companyId || req.companyId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID not found',
      });
    }

    const result = await getAllUsersService(companyId, filters);

    if (result.done) {
      res.json({
        success: true,
        data: result.data,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to fetch users',
      });
    }
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Create a new user
 * @route   POST /api/admin/users
 * @access  Private (Admin)
 */
export async function createUser(req, res) {
  try {
    const companyId = req.user?.companyId || req.companyId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID not found',
      });
    }

    const result = await createUserService(companyId, req.body);

    if (result.done) {
      res.status(201).json({
        success: true,
        data: result.data,
        message: 'User created successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to create user',
      });
    }
  } catch (error) {
    console.error('Error in createUser:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Update an existing user
 * @route   PUT /api/admin/users/:userId
 * @access  Private (Admin)
 */
export async function updateUser(req, res) {
  try {
    const { userId } = req.params;
    const companyId = req.user?.companyId || req.companyId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID not found',
      });
    }

    const result = await updateUserService(companyId, userId, req.body);

    if (result.done) {
      res.json({
        success: true,
        data: result.data,
        message: 'User updated successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to update user',
      });
    }
  } catch (error) {
    console.error('Error in updateUser:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Delete a user
 * @route   DELETE /api/admin/users/:userId
 * @access  Private (Admin)
 */
export async function deleteUser(req, res) {
  try {
    const { userId } = req.params;
    const companyId = req.user?.companyId || req.companyId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID not found',
      });
    }

    const result = await deleteUserService(companyId, userId);

    if (result.done) {
      res.json({
        success: true,
        message: 'User deleted successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to delete user',
      });
    }
  } catch (error) {
    console.error('Error in deleteUser:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get user by ID
 * @route   GET /api/admin/users/:userId
 * @access  Private (Admin)
 */
export async function getUserById(req, res) {
  try {
    const { userId } = req.params;
    const companyId = req.user?.companyId || req.companyId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID not found',
      });
    }

    const result = await getUserByIdService(companyId, userId);

    if (result.done) {
      res.json({
        success: true,
        data: result.data,
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error || 'User not found',
      });
    }
  } catch (error) {
    console.error('Error in getUserById:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

export default {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserById,
};
