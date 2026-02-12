// backend/services/assets/assetCategory.services.js
import { ObjectId } from 'mongodb';
import { getTenantCollections } from '../../config/db.js';

/**
 * Get all asset categories for a company
 */
export const getAssetCategories = async (companyId, params = {}) => {
  const { page = 1, pageSize = 100, filters = {}, sortBy = 'name_asc' } = params;
  const { assetCategories, employees } = getTenantCollections(companyId);

  // Build match query
  const match = {};

  // Status filter
  if (filters.status && filters.status !== 'All') {
    match.status = filters.status.toLowerCase();
  }

  // Search filter
  if (filters.search && String(filters.search).trim().length) {
    const q = String(filters.search).trim();
    match.name = { $regex: q, $options: 'i' };
  }

  // Determine sort
  const sort = {};
  switch (sortBy) {
    case 'name_asc':
      sort.name = 1;
      break;
    case 'name_desc':
      sort.name = -1;
      break;
    case 'createdAt_desc':
      sort.createdAt = -1;
      break;
    case 'createdAt_asc':
      sort.createdAt = 1;
      break;
    default:
      sort.name = 1;
  }

  try {
    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: employees.collectionName,
          let: { categoryName: '$name' },
          pipeline: [
            { $unwind: { path: '$assets', preserveNullAndEmptyArrays: false } },
            {
              $match: {
                $expr: { $eq: ['$assets.assetCategory', '$$categoryName'] },
              },
            },
            { $count: 'count' },
          ],
          as: 'assetsCounted',
        },
      },
      {
        $addFields: {
          assetsCount: { $ifNull: [{ $arrayElemAt: ['$assetsCounted.count', 0] }, 0] },
        },
      },
      { $project: { assetsCounted: 0 } },
      { $sort: sort },
      {
        $facet: {
          data: [{ $skip: (page - 1) * pageSize }, { $limit: pageSize }],
          total: [{ $count: 'count' }],
        },
      },
    ];

    const result = await assetCategories.aggregate(pipeline).toArray();
    const data = result[0]?.data || [];
    const totalCount = result[0]?.total?.[0]?.count || 0;

    // Convert ObjectId to strings
    const formatted = data.map((cat) => ({
      ...cat,
      _id: cat._id.toString(),
    }));

    return {
      done: true,
      data: formatted,
      total: totalCount,
      page,
      pageSize,
    };
  } catch (err) {
    console.error('Error in getAssetCategories:', err);
    return { done: false, error: err.message };
  }
};

/**
 * Create a new asset category
 */
export const createAssetCategory = async (companyId, categoryData) => {
  const { assetCategories } = getTenantCollections(companyId);

  try {
    const newCategory = {
      name: categoryData.name,
      status: categoryData.status?.toLowerCase() || 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await assetCategories.insertOne(newCategory);

    if (!result.acknowledged) {
      throw new Error('Failed to create asset category');
    }

    return {
      done: true,
      data: {
        _id: result.insertedId.toString(),
        ...newCategory,
      },
    };
  } catch (err) {
    console.error('Error in createAssetCategory:', err);
    return { done: false, error: err.message };
  }
};

/**
 * Update an asset category
 */
export const updateAssetCategory = async (companyId, categoryId, updateData) => {
  const { assetCategories } = getTenantCollections(companyId);

  try {
    const updates = {
      name: updateData.name,
      status: updateData.status?.toLowerCase() || 'active',
      updatedAt: new Date(),
    };

    const result = await assetCategories.updateOne(
      { _id: new ObjectId(categoryId) },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      throw new Error('Asset category not found');
    }

    return { done: true };
  } catch (err) {
    console.error('Error in updateAssetCategory:', err);
    return { done: false, error: err.message };
  }
};

/**
 * Delete an asset category
 */
export const deleteAssetCategory = async (companyId, categoryId) => {
  const { assetCategories } = getTenantCollections(companyId);

  try {
    const result = await assetCategories.deleteOne({
      _id: new ObjectId(categoryId),
    });

    if (result.deletedCount === 0) {
      throw new Error('Asset category not found');
    }

    return { done: true };
  } catch (err) {
    console.error('Error in deleteAssetCategory:', err);
    return { done: false, error: err.message };
  }
};
