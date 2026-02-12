// backend/services/assetUsers/assetUsers.services.js
import { ObjectId } from 'mongodb';
import { getTenantCollections } from '../../config/db.js';

/**
 * Get asset assignments with pagination and filters
 * params = { page = 1, pageSize = 20, filters = {}, sortBy = 'assignedDate', order = 'desc' }
 */
export const getAssetUsers = async (companyId, params = {}) => {
  const { page = 1, pageSize = 20, filters = {}, sortBy = 'assignedDate', order = 'desc' } = params;
  const { assetusers, assets, employees, assetCategories } = getTenantCollections(companyId);

  // Build match query
  const match = { isDeleted: false };

  // Status filter
  if (filters.status && filters.status !== 'all') {
    match.status = filters.status.toLowerCase();
  }

  // AssetId filter
  if (filters.assetId) {
    match.assetId = new ObjectId(filters.assetId);
  }

  // EmployeeId filter
  if (filters.employeeId) {
    match.employeeId = new ObjectId(filters.employeeId); // Compare as ObjectId
  }

  // Date range filter
  if (filters.startDate || filters.endDate) {
    match.assignedDate = {};
    if (filters.startDate) match.assignedDate.$gte = new Date(filters.startDate);
    if (filters.endDate) match.assignedDate.$lte = new Date(filters.endDate);
  }

  // Determine sort
  const sort = {};
  sort[sortBy] = order === 'asc' ? 1 : -1;

  try {
    // Build aggregation pipeline
    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: assets.collectionName,
          localField: 'assetId',
          foreignField: '_id',
          as: 'assetData',
        },
      },
      {
        $lookup: {
          from: employees.collectionName,
          let: { empId: '$employeeId' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$_id', '$$empId'] },
              },
            },
            {
              $project: {
                firstName: 1,
                lastName: 1,
                fullName: 1,
                employeeId: 1,
                avatar: 1,
              },
            },
          ],
          as: 'employeeData',
        },
      },
      {
        $lookup: {
          from: assetCategories.collectionName,
          let: { categoryId: { $arrayElemAt: ['$assetData.category', 0] } },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$_id', '$$categoryId'] },
              },
            },
            {
              $project: {
                name: 1,
              },
            },
          ],
          as: 'categoryData',
        },
      },
      {
        $addFields: {
          assetIdDisplay: { $arrayElemAt: ['$assetData.assetId', 0] },
          assetName: { $arrayElemAt: ['$assetData.name', 0] },
          assetSerialNumber: { $arrayElemAt: ['$assetData.serialNumber', 0] },
          assetCategoryName: { $arrayElemAt: ['$categoryData.name', 0] },
          assetStatus: { $arrayElemAt: ['$assetData.status', 0] },
          assetModel: { $arrayElemAt: ['$assetData.model', 0] },
          assetPurchaseDate: { $arrayElemAt: ['$assetData.purchaseDate', 0] },
          assetWarrantyMonths: { $arrayElemAt: ['$assetData.warrantyMonths', 0] },
          assetVendorName: { $arrayElemAt: ['$assetData.vendor.name', 0] },
          employeeName: {
            $ifNull: [
              { $arrayElemAt: ['$employeeData.fullName', 0] },
              {
                $concat: [
                  { $ifNull: [{ $arrayElemAt: ['$employeeData.firstName', 0] }, ''] },
                  ' ',
                  { $ifNull: [{ $arrayElemAt: ['$employeeData.lastName', 0] }, ''] },
                ],
              },
            ],
          },
          employeeAvatar: { $arrayElemAt: ['$employeeData.avatar', 0] },
          employeeIdDisplay: { $arrayElemAt: ['$employeeData.employeeId', 0] },
        },
      },
      {
        $project: {
          assetData: 0,
          employeeData: 0,
          categoryData: 0,
        },
      },
      { $sort: sort },
    ];

    // Get total count
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await assetusers.aggregate(countPipeline).toArray();
    const total = countResult[0]?.total || 0;

    // Add pagination
    pipeline.push({ $skip: (page - 1) * pageSize });
    pipeline.push({ $limit: pageSize });

    // Execute query
    const data = await assetusers.aggregate(pipeline).toArray();

    return {
      success: true,
      data,
      pagination: {
        page,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (error) {
    console.error('[AssetUsers Service] Error fetching asset assignments:', error);
    throw error;
  }
};

/**
 * Get single asset assignment by ID
 */
export const getAssetUserById = async (companyId, id) => {
  try {
    const { assetusers, assets, employees } = getTenantCollections(companyId);

    const pipeline = [
      { $match: { _id: new ObjectId(id), isDeleted: false } },
      {
        $lookup: {
          from: assets.collectionName,
          localField: 'assetId',
          foreignField: '_id',
          as: 'assetData',
        },
      },
      {
        $lookup: {
          from: employees.collectionName,
          let: { empId: '$employeeId' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$_id', '$$empId'] },
              },
            },
          ],
          as: 'employeeData',
        },
      },
      {
        $addFields: {
          asset: { $arrayElemAt: ['$assetData', 0] },
          employee: { $arrayElemAt: ['$employeeData', 0] },
        },
      },
      {
        $project: {
          assetData: 0,
          employeeData: 0,
        },
      },
    ];

    const result = await assetusers.aggregate(pipeline).toArray();
    return result[0] || null;
  } catch (error) {
    console.error('[AssetUsers Service] Error fetching asset assignment:', error);
    throw error;
  }
};

/**
 * Create new asset assignment
 */
export const createAssetUser = async (companyId, data, userId) => {
  try {
    const { assetusers, assets } = getTenantCollections(companyId);

    // Validate asset exists
    const asset = await assets.findOne({ _id: new ObjectId(data.assetId), isDeleted: false });
    if (!asset) {
      return { success: false, message: 'Asset not found' };
    }

    // Check if asset is already assigned and not returned
    const existingAssignment = await assetusers.findOne({
      assetId: new ObjectId(data.assetId),
      status: 'assigned',
      isDeleted: false,
    });

    if (existingAssignment) {
      return { success: false, message: 'Asset is already assigned to another employee' };
    }

    const newAssetUser = {
      assetId: new ObjectId(data.assetId),
      employeeId: new ObjectId(data.employeeId), // Store as ObjectId
      assignedDate: data.assignedDate ? new Date(data.assignedDate) : new Date(),
      status: data.status || 'assigned',
      notes: data.notes || '',
      companyId,
      createdBy: userId,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await assetusers.insertOne(newAssetUser);

    // Update asset's assigned field to true
    await assets.updateOne(
      { _id: new ObjectId(data.assetId) },
      {
        $set: {
          assigned: true, // Use assigned boolean field
          updatedAt: new Date(),
          updatedBy: userId,
        },
      }
    );

    return {
      success: true,
      message: 'Asset assigned successfully',
      data: { _id: result.insertedId, ...newAssetUser },
    };
  } catch (error) {
    console.error('[AssetUsers Service] Error creating asset assignment:', error);
    throw error;
  }
};

/**
 * Update asset assignment
 */
export const updateAssetUser = async (companyId, id, data, userId) => {
  try {
    const { assetusers, assets } = getTenantCollections(companyId);

    const updateData = {
      ...data,
      updatedBy: userId,
      updatedAt: new Date(),
    };

    // If status is being changed to 'returned', set returnedDate
    if (data.status === 'returned' && !data.returnedDate) {
      updateData.returnedDate = new Date();
    }

    // Convert dates if provided
    if (data.assignedDate) {
      updateData.assignedDate = new Date(data.assignedDate);
    }
    if (data.returnedDate) {
      updateData.returnedDate = new Date(data.returnedDate);
    }

    const result = await assetusers.updateOne(
      { _id: new ObjectId(id), isDeleted: false },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return { success: false, message: 'Asset assignment not found' };
    }

    // If status changed to returned, update asset's assigned to false
    if (data.status === 'returned') {
      const assignment = await assetusers.findOne({ _id: new ObjectId(id) });
      if (assignment) {
        await assets.updateOne(
          { _id: assignment.assetId },
          {
            $set: {
              assigned: false, // Use assigned boolean field
              updatedAt: new Date(),
              updatedBy: userId,
            },
          }
        );
      }
    }

    return { success: true, message: 'Asset assignment updated successfully' };
  } catch (error) {
    console.error('[AssetUsers Service] Error updating asset assignment:', error);
    throw error;
  }
};

/**
 * Delete (soft delete) asset assignment
 */
export const deleteAssetUser = async (companyId, id, userId) => {
  try {
    const { assetusers, assets } = getTenantCollections(companyId);

    const assignment = await assetusers.findOne({ _id: new ObjectId(id), isDeleted: false });

    if (!assignment) {
      return { success: false, message: 'Asset assignment not found' };
    }

    // Soft delete
    await assetusers.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: userId,
        },
      }
    );

    // Update asset's assigned field to false
    await assets.updateOne(
      { _id: assignment.assetId },
      {
        $set: {
          assigned: false, // Use assigned boolean field
          updatedAt: new Date(),
          updatedBy: userId,
        },
      }
    );

    return { success: true, message: 'Asset assignment deleted successfully' };
  } catch (error) {
    console.error('[AssetUsers Service] Error deleting asset assignment:', error);
    throw error;
  }
};

/**
 * Get asset assignment history for a specific asset
 */
export const getAssetHistory = async (companyId, assetId) => {
  try {
    const { assetusers, employees } = getTenantCollections(companyId);

    const pipeline = [
      { $match: { assetId: new ObjectId(assetId) } },
      {
        $lookup: {
          from: employees.collectionName,
          let: { empId: '$employeeId' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$_id', '$$empId'] },
              },
            },
          ],
          as: 'employeeData',
        },
      },
      {
        $addFields: {
          employeeName: {
            $concat: [
              { $ifNull: [{ $arrayElemAt: ['$employeeData.firstName', 0] }, ''] },
              ' ',
              { $ifNull: [{ $arrayElemAt: ['$employeeData.lastName', 0] }, ''] },
            ],
          },
        },
      },
      { $sort: { assignedDate: -1 } },
    ];

    const history = await assetusers.aggregate(pipeline).toArray();
    return { success: true, data: history };
  } catch (error) {
    console.error('[AssetUsers Service] Error fetching asset history:', error);
    throw error;
  }
};

/**
 * Get all assets assigned to a specific employee
 */
export const getEmployeeAssets = async (companyId, employeeId) => {
  try {
    const { assetusers, assets, assetCategories } = getTenantCollections(companyId);

    const pipeline = [
      { $match: { employeeId: new ObjectId(employeeId), status: 'assigned', isDeleted: false } },
      {
        $lookup: {
          from: assets.collectionName,
          localField: 'assetId',
          foreignField: '_id',
          as: 'assetData',
        },
      },
      {
        $lookup: {
          from: assetCategories.collectionName,
          let: { categoryId: { $arrayElemAt: ['$assetData.category', 0] } },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$_id', '$$categoryId'] },
              },
            },
            {
              $project: {
                name: 1,
              },
            },
          ],
          as: 'categoryData',
        },
      },
      {
        $addFields: {
          assetIdDisplay: { $arrayElemAt: ['$assetData.assetId', 0] },
          assetName: { $arrayElemAt: ['$assetData.name', 0] },
          assetSerialNumber: { $arrayElemAt: ['$assetData.serialNumber', 0] },
          assetCategoryName: { $arrayElemAt: ['$categoryData.name', 0] },
          assetStatus: { $arrayElemAt: ['$assetData.status', 0] },
          assetModel: { $arrayElemAt: ['$assetData.model', 0] },
          assetPurchaseDate: { $arrayElemAt: ['$assetData.purchaseDate', 0] },
          assetWarrantyMonths: { $arrayElemAt: ['$assetData.warrantyMonths', 0] },
          assetVendorName: { $arrayElemAt: ['$assetData.vendor.name', 0] },
        },
      },
      {
        $project: {
          assetData: 0,
          categoryData: 0,
        },
      },
      { $sort: { assignedDate: -1 } },
    ];

    const assignments = await assetusers.aggregate(pipeline).toArray();
    return { success: true, data: assignments };
  } catch (error) {
    console.error('[AssetUsers Service] Error fetching employee assets:', error);
    throw error;
  }
};
