/**
 * Termination REST Controller
 * Handles all Termination CRUD operations via REST API
 */

import {
  buildNotFoundError,
  buildConflictError,
  buildValidationError,
  asyncHandler
} from '../../middleware/errorHandler.js';
import {
  sendSuccess,
  sendCreated,
  extractUser
} from '../../utils/apiResponse.js';
import { broadcastTerminationEvents, getSocketIO } from '../../utils/socketBroadcaster.js';
import {
  getTerminationStats,
  getTerminations,
  getSpecificTermination,
  addTermination,
  updateTermination,
  deleteTermination,
  processTermination,
  cancelTermination
} from '../../services/hr/termination.services.js';

/**
 * @desc    Get termination statistics
 * @route   GET /api/terminations/stats
 * @access  Private (Admin, HR)
 */
export const getStats = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  const result = await getTerminationStats(user.companyId);

  if (!result.done) {
    throw buildConflictError(result.message);
  }

  return sendSuccess(res, result.data, 'Termination statistics retrieved successfully');
});

/**
 * @desc    Get all terminations with optional filters
 * @route   GET /api/terminations
 * @access  Private (Admin, HR)
 */
export const getAllTerminations = asyncHandler(async (req, res) => {
  const { type, startDate, endDate } = req.query;
  const user = extractUser(req);

  const result = await getTerminations(user.companyId, { type, startDate, endDate });

  if (!result.done) {
    throw buildConflictError(result.message || 'Failed to fetch terminations');
  }

  return sendSuccess(res, result.data, 'Terminations retrieved successfully', 200, {
    total: result.count || 0
  });
});

/**
 * @desc    Get single termination by ID
 * @route   GET /api/terminations/:id
 * @access  Private (Admin, HR)
 */
export const getTerminationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  if (!id) {
    throw buildValidationError('id', 'Termination ID is required');
  }

  const result = await getSpecificTermination(user.companyId, id);

  if (!result.done) {
    throw buildNotFoundError('Termination', id);
  }

  return sendSuccess(res, result.data, 'Termination retrieved successfully');
});

/**
 * @desc    Create new termination
 * @route   POST /api/terminations
 * @access  Private (Admin)
 */
export const createTermination = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const terminationData = req.body;
  const io = getSocketIO(req);

  const result = await addTermination(user.companyId, terminationData, user.userId);

  if (!result.done) {
    if (result.errors) {
      throw buildValidationError('fields', result.message, result.errors);
    }
    throw buildConflictError(result.message);
  }

  // Broadcast termination created event
  if (io && result.data) {
    broadcastTerminationEvents.created(io, user.companyId, result.data);
  }

  return sendCreated(res, result.data || { message: 'Termination created' }, 'Termination created successfully');
});

/**
 * @desc    Update termination
 * @route   PUT /api/terminations/:id
 * @access  Private (Admin)
 */
export const updateTerminationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);
  const updateData = req.body;
  const io = getSocketIO(req);

  if (!id) {
    throw buildValidationError('id', 'Termination ID is required');
  }

  // Add terminationId to updateData
  updateData.terminationId = id;

  const result = await updateTermination(user.companyId, updateData);

  if (!result.done) {
    if (result.message.includes('not found')) {
      throw buildNotFoundError('Termination', id);
    }
    throw buildConflictError(result.message);
  }

  // Broadcast termination updated event
  if (io && result.data) {
    broadcastTerminationEvents.updated(io, user.companyId, result.data);
  }

  return sendSuccess(res, result.data || updateData, 'Termination updated successfully');
});

/**
 * @desc    Delete termination
 * @route   DELETE /api/terminations
 * @access  Private (Admin)
 */
export const deleteTerminations = asyncHandler(async (req, res) => {
  const { terminationIds } = req.body;
  const user = extractUser(req);

  if (!terminationIds || !Array.isArray(terminationIds) || terminationIds.length === 0) {
    throw buildValidationError('terminationIds', 'Termination IDs array is required');
  }

  const result = await deleteTermination(user.companyId, terminationIds);

  if (!result.done) {
    throw buildConflictError(result.message);
  }

  return sendSuccess(res, null, result.message);
});

/**
 * @desc    Process termination (mark as complete)
 * @route   PUT /api/terminations/:id/process
 * @access  Private (Admin, HR)
 */
export const processTerminationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);
  const io = getSocketIO(req);

  if (!id) {
    throw buildValidationError('id', 'Termination ID is required');
  }

  const result = await processTermination(user.companyId, id, user.userId);

  if (!result.done) {
    if (result.message.includes('not found')) {
      throw buildNotFoundError('Termination', id);
    }
    throw buildConflictError(result.message);
  }

  // Broadcast termination processed event
  if (io && result.data) {
    broadcastTerminationEvents.processed(io, user.companyId, result.data);
  }

  return sendSuccess(res, null, 'Termination processed successfully');
});

/**
 * @desc    Cancel termination
 * @route   PUT /api/terminations/:id/cancel
 * @access  Private (Admin, HR)
 */
export const cancelTerminationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const user = extractUser(req);
  const io = getSocketIO(req);

  if (!id) {
    throw buildValidationError('id', 'Termination ID is required');
  }

  const result = await cancelTermination(user.companyId, id, user.userId, reason);

  if (!result.done) {
    if (result.message.includes('not found')) {
      throw buildNotFoundError('Termination', id);
    }
    throw buildConflictError(result.message);
  }

  // Broadcast termination updated event (cancellation is an update)
  if (io && result.data) {
    broadcastTerminationEvents.updated(io, user.companyId, result.data);
  }

  return sendSuccess(res, null, 'Termination cancelled successfully');
});

export default {
  getStats,
  getAllTerminations,
  getTerminationById,
  createTermination,
  updateTerminationById,
  deleteTerminations,
  processTerminationById,
  cancelTerminationById
};
