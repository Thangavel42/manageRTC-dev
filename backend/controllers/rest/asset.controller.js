/**
 * Asset REST Controller
 * Handles all Asset CRUD operations via REST API
 * Uses tenant-specific collections for multi-tenant architecture
 */

import mongoose from 'mongoose';
import { getTenantCollections } from '../../config/db.js';
import {
  asyncHandler,
  buildNotFoundError,
  buildValidationError,
} from '../../middleware/errorHandler.js';
import {
  createAsset as createAssetService,
  deleteAsset as deleteAssetService,
  getAssetById as getAssetByIdService,
  getAssets as getAssetsService,
  updateAsset as updateAssetService,
} from '../../services/assets/assets.services.js';
import { extractUser, sendCreated, sendSuccess } from '../../utils/apiResponse.js';

/**
 * @desc    Get all assets with pagination and filtering
 * @route   GET /api/assets
 * @access  Private (Admin, HR, Superadmin)
 */
export const getAssets = asyncHandler(async (req, res) => {
  const { page, limit, search, status, category, sortBy, order } = req.query;
  const user = extractUser(req);

  const params = {
    page: parseInt(page) || 1,
    pageSize: parseInt(limit) || 20,
    sortBy: sortBy || 'createdAt',
    order: order || 'desc',
    filters: {
      ...(status ? { status } : {}),
      ...(category ? { category } : {}),
      ...(search ? { search } : {}),
    },
  };

  const result = await getAssetsService(user.companyId, params);

  if (!result.done) {
    throw new Error(result.error || 'Failed to fetch assets');
  }

  // Get category names from tenant collection
  const { assetCategories } = getTenantCollections(user.companyId);
  const categoryList = await assetCategories.find({}).toArray();
  const categoryMap = new Map(categoryList.map((cat) => [cat._id.toString(), cat.name]));

  // Add category name to each asset
  const assetsWithCategoryName = result.data.map((asset) => ({
    ...asset,
    categoryName: asset.category ? categoryMap.get(asset.category) : null,
  }));

  return sendSuccess(
    res,
    assetsWithCategoryName,
    'Assets retrieved successfully',
    200,
    result.pagination
  );
});

/**
 * @desc    Get single asset by ID
 * @route   GET /api/assets/:id
 * @access  Private (All authenticated users)
 */
export const getAssetById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid asset ID format');
  }

  const result = await getAssetByIdService(user.companyId, id);

  if (!result.done) {
    throw buildNotFoundError('Asset', id);
  }

  // Get category name from tenant collection
  const { assetCategories } = getTenantCollections(user.companyId);

  if (result.data.category) {
    const category = await assetCategories.findOne({
      _id: new mongoose.Types.ObjectId(result.data.category),
    });
    result.data.categoryName = category?.name || null;
  }

  return sendSuccess(res, result.data, 'Asset retrieved successfully');
});

/**
 * @desc    Create new asset
 * @route   POST /api/assets
 * @access  Private (Admin, HR, Superadmin)
 */
export const createAsset = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const assetData = req.body;

  // Validate category if provided
  if (assetData.category && !mongoose.Types.ObjectId.isValid(assetData.category)) {
    throw buildValidationError('category', 'Invalid category ID format');
  }

  const result = await createAssetService(user.companyId, assetData, user.userId);

  if (!result.done) {
    throw new Error(result.error || 'Failed to create asset');
  }

  // Get category name from tenant collection
  const { assetCategories } = getTenantCollections(user.companyId);

  if (result.data.category) {
    const category = await assetCategories.findOne({
      _id: new mongoose.Types.ObjectId(result.data.category),
    });
    result.data.categoryName = category?.name || null;
  }

  return sendCreated(res, result.data, 'Asset created successfully');
});

/**
 * @desc    Update asset
 * @route   PUT /api/assets/:id
 * @access  Private (Admin, HR, Superadmin)
 */
export const updateAsset = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);
  const updateData = req.body;

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid asset ID format');
  }

  // Validate category if provided
  if (updateData.category && !mongoose.Types.ObjectId.isValid(updateData.category)) {
    throw buildValidationError('category', 'Invalid category ID format');
  }

  const result = await updateAssetService(user.companyId, id, updateData, user.userId);

  if (!result.done) {
    throw new Error(result.error || 'Failed to update asset');
  }

  // Get updated asset
  const assetResult = await getAssetByIdService(user.companyId, id);
  if (assetResult.done) {
    // Get category name
    const { assetCategories } = getTenantCollections(user.companyId);
    if (assetResult.data.category) {
      const category = await assetCategories.findOne({
        _id: new mongoose.Types.ObjectId(assetResult.data.category),
      });
      assetResult.data.categoryName = category?.name || null;
    }
    return sendSuccess(res, assetResult.data, 'Asset updated successfully');
  }

  return sendSuccess(res, {}, 'Asset updated successfully');
});

/**
 * @desc    Delete asset (soft delete)
 * @route   DELETE /api/assets/:id
 * @access  Private (Admin, Superadmin)
 */
export const deleteAsset = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid asset ID format');
  }

  const result = await deleteAssetService(user.companyId, id, user.userId);

  if (!result.done) {
    throw new Error(result.error || 'Failed to delete asset');
  }

  return sendSuccess(
    res,
    {
      _id: id,
      isDeleted: true,
    },
    'Asset deleted successfully'
  );
});

/**
 * @desc    Get assets by category
 * @route   GET /api/assets/category/:category
 * @access  Private (All authenticated users)
 */
export const getAssetsByCategory = asyncHandler(async (req, res) => {
  const { category } = req.params;
  const { page, limit } = req.query;
  const user = extractUser(req);

  // Validate and convert category to ObjectId
  if (!mongoose.Types.ObjectId.isValid(category)) {
    throw buildValidationError('category', 'Invalid category ID format');
  }

  const params = {
    page: parseInt(page) || 1,
    pageSize: parseInt(limit) || 20,
    sortBy: 'name',
    order: 'asc',
    filters: { category },
  };

  const result = await getAssetsService(user.companyId, params);

  if (!result.done) {
    throw new Error(result.error || 'Failed to fetch assets');
  }

  return sendSuccess(
    res,
    result.data,
    `Assets in category '${category}' retrieved successfully`,
    200,
    result.pagination
  );
});

/**
 * @desc    Get assets by status
 * @route   GET /api/assets/status/:status
 * @access  Private (All authenticated users)
 */
export const getAssetsByStatus = asyncHandler(async (req, res) => {
  const { status } = req.params;
  const { page, limit } = req.query;
  const user = extractUser(req);

  // Validate status
  const validStatuses = ['active', 'inactive'];
  if (!validStatuses.includes(status)) {
    throw buildValidationError(
      'status',
      `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    );
  }

  const params = {
    page: parseInt(page) || 1,
    pageSize: parseInt(limit) || 20,
    sortBy: 'name',
    order: 'asc',
    filters: { status },
  };

  const result = await getAssetsService(user.companyId, params);

  if (!result.done) {
    throw new Error(result.error || 'Failed to fetch assets');
  }

  return sendSuccess(
    res,
    result.data,
    `Assets with status '${status}' retrieved successfully`,
    200,
    result.pagination
  );
});

/**
 * @desc    Get asset statistics
 * @route   GET /api/assets/stats
 * @access  Private (Admin, HR, Superadmin)
 */
export const getAssetStats = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const { assets } = getTenantCollections(user.companyId);

  // Aggregate statistics
  const pipeline = [
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        inactive: { $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] } },
        totalValue: { $sum: '$purchaseValue' },
      },
    },
  ];

  const result = await assets.aggregate(pipeline).toArray();
  const stats = result[0] || { total: 0, active: 0, inactive: 0, totalValue: 0 };

  // Remove depreciation calculation since currentValue field no longer exists
  // If depreciation stats are needed, calculate from individual asset.depreciatedValue virtual

  stats.activeRate = stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(2) : 0;

  return sendSuccess(res, stats, 'Asset statistics retrieved successfully');
});

export default {
  getAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  getAssetsByCategory,
  getAssetsByStatus,
  getAssetStats,
};
