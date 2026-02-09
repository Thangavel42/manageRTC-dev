/**
 * Designation REST Controller
 * Wraps existing designation service functions for REST API
 */

import {
  displayDesignations,
  addDesignation,
  updateDesignation,
  deleteDesignation,
  reassignAndDeleteDesignation
} from '../../services/hr/hrm.designation.js';
import logger from '../../utils/logger.js';
import { getSocketIO, broadcastDesignationEvents } from '../../utils/socketBroadcaster.js';

/**
 * Helper function to check if user has required role
 * @param {Object} user - User object from request
 * @param {string[]} allowedRoles - Array of allowed roles
 * @returns {boolean} - True if user has access
 */
const ensureRole = (user, allowedRoles = []) => {
  const role = user?.role?.toLowerCase();
  return allowedRoles.includes(role);
};

/**
 * Helper function to send 403 Forbidden response
 */
const sendForbidden = (res, message = 'You do not have permission to access this resource') => {
  return res.status(403).json({
    success: false,
    error: { message }
  });
};

/**
 * Helper to extract user info from request
 */
const extractUser = (req) => ({
  userId: req.user?.userId,
  companyId: req.user?.companyId,
  role: req.user?.role
});

/**
 * Get all designations with optional filtering
 * REST API: GET /api/designations
 */
export const getAllDesignations = async (req, res) => {
  try {
    // Use validated query if available, otherwise use original query (for non-validated routes)
    const query = req.validatedQuery || req.query;
    const { departmentId, status } = query;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Company ID is required' }
      });
    }

    const filters = {};
    if (departmentId) filters.departmentId = departmentId;
    if (status) filters.status = status;

    const result = await displayDesignations(companyId, null, filters);

    if (result.done) {
      res.json({
        success: true,
        data: result.data,
        count: result.data.length
      });
    } else {
      res.status(400).json({
        success: false,
        error: { message: result.error || 'Failed to fetch designations' }
      });
    }
  } catch (error) {
    logger.error('Error fetching designations:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch designations' }
    });
  }
};

/**
 * Get single designation by ID
 * REST API: GET /api/designations/:id
 */
export const getDesignationById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Company ID is required' }
      });
    }

    const result = await displayDesignations(companyId, null, { _id: id });

    if (result.done && result.data && result.data.length > 0) {
      res.json({
        success: true,
        data: result.data[0]
      });
    } else {
      res.status(404).json({
        success: false,
        error: { message: 'Designation not found' }
      });
    }
  } catch (error) {
    logger.error('Error fetching designation:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch designation' }
    });
  }
};

/**
 * Create new designation
 * REST API: POST /api/designations
 */
export const createDesignation = async (req, res) => {
  try {
    const user = extractUser(req);
    const companyId = req.user?.companyId;
    const hrId = req.user?.userId;
    const payload = req.body;

    if (!companyId || !hrId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required' }
      });
    }

    // Role check: Only admin, hr, superadmin can create designations
    if (!ensureRole(user, ['admin', 'hr', 'superadmin'])) {
      return sendForbidden(res, 'Only Admin and HR can create designations');
    }

    const result = await addDesignation(companyId, hrId, payload);

    if (result.done) {
      // Get the created designation to return full data
      const displayResult = await displayDesignations(companyId, null, { _id: result.data._id });

      // Broadcast Socket.IO event
      const io = getSocketIO(req);
      if (io && displayResult.data && displayResult.data.length > 0) {
        broadcastDesignationEvents.created(io, companyId, displayResult.data[0]);
      }

      res.status(201).json({
        success: true,
        data: displayResult.data && displayResult.data.length > 0 ? displayResult.data[0] : result.data,
        message: 'Designation created successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: { message: result.error || 'Failed to create designation' }
      });
    }
  } catch (error) {
    logger.error('Error creating designation:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to create designation' }
    });
  }
};

/**
 * Update designation
 * REST API: PUT /api/designations/:id
 */
export const updateDesignationById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = extractUser(req);
    const companyId = req.user?.companyId;
    const hrId = req.user?.userId;
    const payload = { ...req.body, designationId: id };

    if (!companyId || !hrId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required' }
      });
    }

    // Role check: Only admin, hr, superadmin can update designations
    if (!ensureRole(user, ['admin', 'hr', 'superadmin'])) {
      return sendForbidden(res, 'Only Admin and HR can update designations');
    }

    const result = await updateDesignation(companyId, hrId, payload);

    if (result.done) {
      // Get the updated designation to return full data
      const displayResult = await displayDesignations(companyId, null, { _id: id });

      // Broadcast Socket.IO event
      const io = getSocketIO(req);
      if (io && displayResult.data && displayResult.data.length > 0) {
        broadcastDesignationEvents.updated(io, companyId, displayResult.data[0]);
      }

      res.json({
        success: true,
        data: displayResult.data && displayResult.data.length > 0 ? displayResult.data[0] : result.data,
        message: 'Designation updated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: { message: result.error || 'Failed to update designation' }
      });
    }
  } catch (error) {
    logger.error('Error updating designation:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update designation' }
    });
  }
};

/**
 * Update designation status
 * REST API: PUT /api/designations/:id/status
 */
export const updateDesignationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const user = extractUser(req);
    const companyId = req.user?.companyId;
    const hrId = req.user?.userId;

    if (!companyId || !hrId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required' }
      });
    }

    // Role check: Only admin, hr, superadmin can update designation status
    if (!ensureRole(user, ['admin', 'hr', 'superadmin'])) {
      return sendForbidden(res, 'Only Admin and HR can update designation status');
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        error: { message: 'Status is required' }
      });
    }

    const payload = { designationId: id, status };
    const result = await updateDesignation(companyId, hrId, payload);

    if (result.done) {
      // Get the updated designation to return full data
      const displayResult = await displayDesignations(companyId, null, { _id: id });

      // Broadcast Socket.IO event
      const io = getSocketIO(req);
      if (io && displayResult.data && displayResult.data.length > 0) {
        broadcastDesignationEvents.updated(io, companyId, displayResult.data[0]);
      }

      res.json({
        success: true,
        data: displayResult.data && displayResult.data.length > 0 ? displayResult.data[0] : result.data,
        message: `Designation status updated to ${status}`
      });
    } else {
      res.status(400).json({
        success: false,
        error: { message: result.error || 'Failed to update designation status' }
      });
    }
  } catch (error) {
    logger.error('Error updating designation status:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update designation status' }
    });
  }
};

/**
 * Delete designation
 * REST API: DELETE /api/designations/:id
 */
export const deleteDesignationById = async (req, res) => {
  try {
    const { id } = req.params;
    const { reassignTo } = req.body;
    const user = extractUser(req);
    const companyId = req.user?.companyId;
    const hrId = req.user?.userId;

    if (!companyId || !hrId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required' }
      });
    }

    // Role check: Only admin and superadmin can delete designations
    if (!ensureRole(user, ['admin', 'superadmin'])) {
      return sendForbidden(res, 'Only Admin can delete designations');
    }

    let result;
    if (reassignTo) {
      // Reassign employees and delete
      const payload = {
        sourceDesignationId: id,
        targetDesignationId: reassignTo
      };
      result = await reassignAndDeleteDesignation(companyId, hrId, payload);
    } else {
      // Simple delete
      result = await deleteDesignation(companyId, hrId, id);
    }

    if (result.done) {
      // Broadcast Socket.IO event
      const io = getSocketIO(req);
      if (io) {
        broadcastDesignationEvents.deleted(io, companyId, id, hrId);
      }

      res.json({
        success: true,
        data: { _id: id },
        message: 'Designation deleted successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: { message: result.error || 'Failed to delete designation' }
      });
    }
  } catch (error) {
    logger.error('Error deleting designation:', error);
    if (error?.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code || 'INTERNAL_ERROR',
          message: error.message,
          details: error.details || []
        }
      });
    }
    res.status(500).json({
      success: false,
      error: { message: 'Failed to delete designation' }
    });
  }
};

export default {
  getAllDesignations,
  getDesignationById,
  createDesignation,
  updateDesignationById,
  updateDesignationStatus,
  deleteDesignationById
};
