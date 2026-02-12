/**
 * AssetUser REST Controller
 * Handles all Asset Assignment CRUD operations via REST API
 * Uses tenant-specific collections for multi-tenant architecture
 */

import {
  asyncHandler,
  buildNotFoundError,
  buildValidationError,
} from '../../middleware/errorHandler.js';
import {
  createAssetUser as createAssetUserService,
  deleteAssetUser as deleteAssetUserService,
  getAssetHistory as getAssetHistoryService,
  getAssetUserById as getAssetUserByIdService,
  getAssetUsers as getAssetUsersService,
  getEmployeeAssets as getEmployeeAssetsService,
  updateAssetUser as updateAssetUserService,
} from '../../services/assetUsers/assetUsers.services.js';
import { extractUser, sendCreated, sendSuccess } from '../../utils/apiResponse.js';

/**
 * @desc    Get all asset assignments with pagination and filtering
 * @route   GET /api/asset-users
 * @access  Private (Admin, HR, Manager, Superadmin)
 */
export const getAssetUsers = asyncHandler(async (req, res) => {
  const { page, limit, status, assetId, employeeId, startDate, endDate, sortBy, order } = req.query;
  const user = extractUser(req);

  const params = {
    page: parseInt(page) || 1,
    pageSize: parseInt(limit) || 20,
    sortBy: sortBy || 'assignedDate',
    order: order || 'desc',
    filters: {
      ...(status ? { status } : {}),
      ...(assetId ? { assetId } : {}),
      ...(employeeId ? { employeeId } : {}),
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
    },
  };

  const result = await getAssetUsersService(user.companyId, params);

  if (!result.success) {
    throw new Error(result.message || 'Failed to fetch asset assignments');
  }

  return sendSuccess(
    res,
    {
      assetUsers: result.data || [],
      pagination: result.pagination,
    },
    'Asset assignments retrieved successfully'
  );
});

/**
 * @desc    Get single asset assignment by ID
 * @route   GET /api/asset-users/:id
 * @access  Private (Admin, HR, Manager, Superadmin)
 */
export const getAssetUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  const assetUser = await getAssetUserByIdService(user.companyId, id);

  if (!assetUser) {
    throw buildNotFoundError('Asset assignment not found');
  }

  return sendSuccess(res, 'Asset assignment retrieved successfully', assetUser);
});

/**
 * @desc    Create new asset assignment
 * @route   POST /api/asset-users
 * @access  Private (Admin, HR, Manager, Superadmin)
 */
export const createAssetUser = asyncHandler(async (req, res) => {
  const { assetId, employeeId, assignedDate, notes, status } = req.body;
  const user = extractUser(req);

  // Validation
  if (!assetId || !employeeId) {
    throw buildValidationError('Asset ID and Employee ID are required');
  }

  const result = await createAssetUserService(
    user.companyId,
    {
      assetId,
      employeeId,
      assignedDate,
      notes,
      status,
    },
    user.userId
  );

  if (!result.success) {
    throw new Error(result.message);
  }

  return sendCreated(res, result.message, result.data);
});

/**
 * @desc    Update asset assignment
 * @route   PUT /api/asset-users/:id
 * @access  Private (Admin, HR, Manager, Superadmin)
 */
export const updateAssetUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { assignedDate, returnedDate, status, notes } = req.body;
  const user = extractUser(req);

  const updateData = {};
  if (assignedDate !== undefined) updateData.assignedDate = assignedDate;
  if (returnedDate !== undefined) updateData.returnedDate = returnedDate;
  if (status !== undefined) updateData.status = status;
  if (notes !== undefined) updateData.notes = notes;

  const result = await updateAssetUserService(user.companyId, id, updateData, user.userId);

  if (!result.success) {
    throw buildNotFoundError(result.message);
  }

  return sendSuccess(res, result.message);
});

/**
 * @desc    Delete asset assignment (soft delete)
 * @route   DELETE /api/asset-users/:id
 * @access  Private (Admin, Superadmin)
 */
export const deleteAssetUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  const result = await deleteAssetUserService(user.companyId, id, user.userId);

  if (!result.success) {
    throw buildNotFoundError(result.message);
  }

  return sendSuccess(res, result.message);
});

/**
 * @desc    Get asset assignment history for a specific asset
 * @route   GET /api/asset-users/asset/:assetId/history
 * @access  Private (Admin, HR, Manager, Superadmin)
 */
export const getAssetHistory = asyncHandler(async (req, res) => {
  const { assetId } = req.params;
  const user = extractUser(req);

  const result = await getAssetHistoryService(user.companyId, assetId);

  if (!result.success) {
    throw new Error(result.message || 'Failed to fetch asset history');
  }

  return sendSuccess(res, 'Asset history retrieved successfully', result.data);
});

/**
 * @desc    Get all assets assigned to a specific employee
 * @route   GET /api/asset-users/employee/:employeeId
 * @access  Private (Admin, HR, Manager, Employee, Superadmin)
 */
export const getEmployeeAssets = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const user = extractUser(req);

  const result = await getEmployeeAssetsService(user.companyId, employeeId);

  if (!result.success) {
    throw new Error(result.message || 'Failed to fetch employee assets');
  }

  return sendSuccess(res, result.data, 'Employee assets retrieved successfully');
});
