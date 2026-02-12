// backend/services/assets/assets.services.js
import { ObjectId } from 'mongodb';
import { getTenantCollections } from '../../config/db.js';
import { generateAssetId } from '../../utils/idGenerator.js';

/**
 * Get assets with pagination + filters from assets collection
 * params = { page = 1, pageSize = 20, filters = {}, sortBy = 'createdAt', order = 'desc' }
 */
export const getAssets = async (companyId, params = {}) => {
  const { page = 1, pageSize = 20, filters = {}, sortBy = 'createdAt', order = 'desc' } = params;
  const { assets, employees } = getTenantCollections(companyId);

  // Build match query
  const match = {};

  // Status filter
  if (filters.status && filters.status !== 'all') {
    match.status = filters.status.toLowerCase();
  }

  // Category filter
  if (filters.category) {
    match.category = new ObjectId(filters.category);
  }

  // AssignedTo filter
  if (filters.assignedTo) {
    match.assignedTo = new ObjectId(filters.assignedTo);
  }

  // Search filter
  if (filters.search && String(filters.search).trim().length) {
    const q = String(filters.search).trim();
    match.$or = [
      { name: { $regex: q, $options: 'i' } },
      { serialNumber: { $regex: q, $options: 'i' } },
      { barcode: { $regex: q, $options: 'i' } },
    ];
  }

  // Not deleted
  match.isDeleted = false;

  // Determine sort
  const sort = {};
  sort[sortBy] = order === 'asc' ? 1 : -1;

  try {
    // Build aggregation pipeline
    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: employees.collectionName,
          let: { assignedToId: '$assignedTo' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$_id', '$$assignedToId'] },
              },
            },
            {
              $project: {
                firstName: 1,
                lastName: 1,
                fullName: 1,
                employeeId: 1,
              },
            },
          ],
          as: 'assignedToData',
        },
      },
      {
        $addFields: {
          assignedToName: {
            $cond: {
              if: { $eq: ['$assignedTo', null] },
              then: 'Not Assigned',
              else: {
                $ifNull: [
                  { $arrayElemAt: ['$assignedToData.fullName', 0] },
                  {
                    $cond: {
                      if: {
                        $or: [
                          { $ne: [{ $arrayElemAt: ['$assignedToData.firstName', 0] }, null] },
                          { $ne: [{ $arrayElemAt: ['$assignedToData.lastName', 0] }, null] },
                        ],
                      },
                      then: {
                        $concat: [
                          { $ifNull: [{ $arrayElemAt: ['$assignedToData.firstName', 0] }, ''] },
                          ' ',
                          { $ifNull: [{ $arrayElemAt: ['$assignedToData.lastName', 0] }, ''] },
                        ],
                      },
                      else: 'Not Assigned',
                    },
                  },
                ],
              },
            },
          },
        },
      },
      { $project: { assignedToData: 0 } },
      { $sort: sort },
      {
        $facet: {
          data: [{ $skip: (page - 1) * pageSize }, { $limit: pageSize }],
          total: [{ $count: 'count' }],
        },
      },
    ];

    const result = await assets.aggregate(pipeline).toArray();
    const data = result[0]?.data || [];
    const total = result[0]?.total?.[0]?.count || 0;

    // Convert ObjectIds to strings
    const formatted = data.map((asset) => ({
      ...asset,
      _id: asset._id.toString(),
      category: asset.category ? asset.category.toString() : null,
      assignedTo: asset.assignedTo ? asset.assignedTo.toString() : null,
    }));

    return {
      done: true,
      data: formatted,
      pagination: {
        page,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (err) {
    console.error('Error in getAssets:', err);
    return { done: false, error: err.message };
  }
};

/**
 * Get single asset by ID
 */
export const getAssetById = async (companyId, assetId) => {
  const { assets } = getTenantCollections(companyId);

  try {
    const asset = await assets.findOne({
      _id: new ObjectId(assetId),
      isDeleted: false,
    });

    if (!asset) {
      return { done: false, error: 'Asset not found' };
    }

    return {
      done: true,
      data: {
        ...asset,
        _id: asset._id.toString(),
        category: asset.category ? asset.category.toString() : null,
        assignedTo: asset.assignedTo ? asset.assignedTo.toString() : null,
      },
    };
  } catch (err) {
    console.error('Error in getAssetById:', err);
    return { done: false, error: err.message };
  }
};

/**
 * Create new asset
 */
export const createAsset = async (companyId, assetData, userId) => {
  const { assets } = getTenantCollections(companyId);

  try {
    // Generate unique asset ID
    const assetId = await generateAssetId(companyId);

    const newAsset = {
      assetId, // Add generated asset ID
      name: assetData.name,
      category: assetData.category ? new ObjectId(assetData.category) : null,
      serialNumber: assetData.serialNumber || null,
      barcode: assetData.barcode || null,
      model: assetData.model || null,
      vendor: assetData.vendor || {},
      purchaseDate: assetData.purchaseDate ? new Date(assetData.purchaseDate) : new Date(),
      purchaseValue: Number(assetData.purchaseValue) || 0,
      warrantyMonths: Number(assetData.warrantyMonths) || 0,
      status: assetData.status?.toLowerCase() || 'active',
      assigned: false, // Track assignment status - will be updated when asset is assigned via AssetUsers
      isDeleted: false,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Calculate warranty expiry date
    if (newAsset.purchaseDate && newAsset.warrantyMonths > 0) {
      const expiryDate = new Date(newAsset.purchaseDate);
      expiryDate.setMonth(expiryDate.getMonth() + newAsset.warrantyMonths);
      newAsset.warranty = {
        expiryDate,
      };
    }

    const result = await assets.insertOne(newAsset);

    if (!result.acknowledged) {
      throw new Error('Failed to create asset');
    }

    return {
      done: true,
      data: {
        ...newAsset,
        _id: result.insertedId.toString(),
        category: newAsset.category ? newAsset.category.toString() : null,
        assignedTo: newAsset.assignedTo ? newAsset.assignedTo.toString() : null,
      },
    };
  } catch (err) {
    console.error('Error in createAsset:', err);
    return { done: false, error: err.message };
  }
};

/**
 * Update asset
 */
export const updateAsset = async (companyId, assetId, updateData, userId) => {
  const { assets } = getTenantCollections(companyId);

  try {
    const updates = {
      ...(updateData.name && { name: updateData.name }),
      ...(updateData.category && { category: new ObjectId(updateData.category) }),
      ...(updateData.serialNumber !== undefined && { serialNumber: updateData.serialNumber }),
      ...(updateData.barcode !== undefined && { barcode: updateData.barcode }),
      ...(updateData.model !== undefined && { model: updateData.model }),
      ...(updateData.vendor !== undefined && { vendor: updateData.vendor }),
      ...(updateData.purchaseDate && { purchaseDate: new Date(updateData.purchaseDate) }),
      ...(updateData.purchaseValue !== undefined && {
        purchaseValue: Number(updateData.purchaseValue),
      }),
      ...(updateData.warrantyMonths !== undefined && {
        warrantyMonths: Number(updateData.warrantyMonths),
      }),
      ...(updateData.status && { status: updateData.status.toLowerCase() }),
      updatedBy: userId,
      updatedAt: new Date(),
    };

    // NOTE: Asset assignment is now handled through AssetUsers collection
    // Use AssetUsers API endpoints to assign/unassign assets

    // Recalculate warranty if purchase date or warranty months changed
    if (updateData.purchaseDate || updateData.warrantyMonths !== undefined) {
      const asset = await assets.findOne({ _id: new ObjectId(assetId) });
      const purchaseDate = updateData.purchaseDate
        ? new Date(updateData.purchaseDate)
        : asset.purchaseDate;
      const warrantyMonths =
        updateData.warrantyMonths !== undefined
          ? Number(updateData.warrantyMonths)
          : asset.warrantyMonths;

      if (purchaseDate && warrantyMonths > 0) {
        const expiryDate = new Date(purchaseDate);
        expiryDate.setMonth(expiryDate.getMonth() + warrantyMonths);
        updates['warranty.expiryDate'] = expiryDate;
      }
    }

    const result = await assets.updateOne(
      { _id: new ObjectId(assetId), isDeleted: false },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      throw new Error('Asset not found');
    }

    return { done: true };
  } catch (err) {
    console.error('Error in updateAsset:', err);
    return { done: false, error: err.message };
  }
};

/**
 * Delete asset (soft delete)
 */
export const deleteAsset = async (companyId, assetId, userId) => {
  const { assets } = getTenantCollections(companyId);

  try {
    const result = await assets.updateOne(
      { _id: new ObjectId(assetId), isDeleted: false },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: userId,
          status: 'inactive',
        },
      }
    );

    if (result.matchedCount === 0) {
      throw new Error('Asset not found');
    }

    return { done: true };
  } catch (err) {
    console.error('Error in deleteAsset:', err);
    return { done: false, error: err.message };
  }
};
