/**
 * Asset Category REST API Controller
 * Handles CRUD operations for asset categories
 */

import mongoose from 'mongoose';
import {
  asyncHandler,
  buildNotFoundError,
  buildValidationError,
} from '../../middleware/errorHandler.js';
import {
  createAssetCategory,
  deleteAssetCategory,
  getAssetCategories,
  updateAssetCategory,
} from '../../services/assets/assetCategory.services.js';
import { extractUser, sendCreated, sendSuccess } from '../../utils/apiResponse.js';

/**
 * @desc    Get all asset categories
 * @route   GET /api/asset-categories
 * @access  Private (Admin, HR)
 */
export const getCategories = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const { page = 1, pageSize = 50, sortBy = 'name_asc', status, search } = req.query;

  const params = {
    page: parseInt(page),
    pageSize: parseInt(pageSize),
    sortBy,
    filters: {
      ...(status && status !== 'All' ? { status } : {}),
      ...(search ? { search } : {}),
    },
  };

  const result = await getAssetCategories(user.companyId, params);

  if (!result.done) {
    throw new Error(result.error || 'Failed to fetch asset categories');
  }

  return sendSuccess(
    res,
    {
      categories: result.data || [],
      pagination: result.pagination,
    },
    'Asset categories retrieved successfully'
  );
});

/**
 * @desc    Get single asset category by ID
 * @route   GET /api/asset-categories/:id
 * @access  Private (Admin, HR)
 */
export const getCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid category ID format');
  }

  const result = await getAssetCategories(user.companyId, {
    page: 1,
    pageSize: 1,
    filters: { _id: id },
  });

  if (!result.done || !result.data || result.data.length === 0) {
    throw buildNotFoundError('Asset category', id);
  }

  return sendSuccess(res, result.data[0], 'Asset category retrieved successfully');
});

/**
 * @desc    Create new asset category
 * @route   POST /api/asset-categories
 * @access  Private (Admin)
 */
export const createCategory = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const { name, status = 'active' } = req.body;

  if (!name || !name.trim()) {
    throw buildValidationError('name', 'Category name is required');
  }

  const result = await createAssetCategory(user.companyId, {
    name: name.trim(),
    status: status.toLowerCase(),
  });

  if (!result.done) {
    throw new Error(result.error || 'Failed to create asset category');
  }

  return sendCreated(res, result.data, 'Asset category created successfully');
});

/**
 * @desc    Update asset category
 * @route   PUT /api/asset-categories/:id
 * @access  Private (Admin)
 */
export const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);
  const { name, status } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid category ID format');
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name.trim();
  if (status !== undefined) updateData.status = status.toLowerCase();

  if (Object.keys(updateData).length === 0) {
    throw buildValidationError('updateData', 'No fields to update');
  }

  const result = await updateAssetCategory(user.companyId, id, updateData);

  if (!result.done) {
    throw new Error(result.error || 'Failed to update asset category');
  }

  return sendSuccess(res, result.data, 'Asset category updated successfully');
});

/**
 * @desc    Delete asset category
 * @route   DELETE /api/asset-categories/:id
 * @access  Private (Admin)
 */
export const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid category ID format');
  }

  const result = await deleteAssetCategory(user.companyId, id);

  if (!result.done) {
    throw new Error(result.error || 'Failed to delete asset category');
  }

  return sendSuccess(res, { _id: id, deleted: true }, 'Asset category deleted successfully');
});

export default {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
