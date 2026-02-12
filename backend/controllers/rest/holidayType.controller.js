/**
 * Holiday Type REST Controller
 * Handles all Holiday Type CRUD operations via REST API
 */

import mongoose from 'mongoose';
import { getTenantCollections } from '../../config/db.js';
import {
    asyncHandler, buildConflictError, buildNotFoundError, buildValidationError
} from '../../middleware/errorHandler.js';
import {
    extractUser, sendCreated, sendSuccess
} from '../../utils/apiResponse.js';

/**
 * @desc    Get all holiday types
 * @route   GET /api/holiday-types
 * @access  Private
 */
export const getHolidayTypes = asyncHandler(async (req, res) => {
  const { active } = req.query;
  const user = extractUser(req);

  // Read from tenant DB to stay consistent with HR service insertions
  const collections = getTenantCollections(user.companyId);

  const filter = { isDeleted: { $ne: true } };
  if (active !== undefined) {
    filter.isActive = active === 'true';
  }

  const holidayTypes = await collections.holidayTypes
    .find(filter)
    .sort({ createdAt: 1, name: 1 })
    .toArray();

  return sendSuccess(res, holidayTypes, 'Holiday types retrieved successfully');
});

/**
 * @desc    Get single holiday type by ID
 * @route   GET /api/holiday-types/:id
 * @access  Private
 */
export const getHolidayTypeById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid holiday type ID format');
  }

  const collections = getTenantCollections(user.companyId);

  const holidayType = await collections.holidayTypes.findOne({
    _id: new mongoose.Types.ObjectId(id),
    isDeleted: { $ne: true }
  });

  if (!holidayType) {
    throw buildNotFoundError('Holiday Type', id);
  }

  return sendSuccess(res, holidayType);
});

/**
 * @desc    Create new holiday type
 * @route   POST /api/holiday-types
 * @access  Private (Admin, HR)
 */
export const createHolidayType = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const holidayTypeData = req.body;

  // Validate required fields
  if (!holidayTypeData.name || !holidayTypeData.code) {
    throw buildValidationError('fields', 'Name and code are required');
  }

  // Use tenant collection for consistency with HR service
  const collections = getTenantCollections(user.companyId);

  const code = holidayTypeData.code.toUpperCase();

  const existingByCode = await collections.holidayTypes.findOne({
    code,
    isDeleted: { $ne: true }
  });

  if (existingByCode) {
    throw buildConflictError('Holiday type with this code already exists');
  }

  const holidayTypeDoc = {
    name: holidayTypeData.name,
    code,
    isActive: holidayTypeData.isActive !== false,
    description: holidayTypeData.description || '',
    companyId: user.companyId,
    createdBy: user.userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
  };

  const result = await collections.holidayTypes.insertOne(holidayTypeDoc);
  const created = { _id: result.insertedId, ...holidayTypeDoc };

  return sendCreated(res, created, 'Holiday type created successfully');
});

/**
 * @desc    Update holiday type
 * @route   PUT /api/holiday-types/:id
 * @access  Private (Admin, HR)
 */
export const updateHolidayType = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);
  const updateData = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid holiday type ID format');
  }

  const collections = getTenantCollections(user.companyId);

  const holidayType = await collections.holidayTypes.findOne({
    _id: new mongoose.Types.ObjectId(id),
    isDeleted: { $ne: true }
  });

  if (!holidayType) {
    throw buildNotFoundError('Holiday Type', id);
  }

  const updateDoc = {
    ...updateData,
    updatedBy: user.userId,
    updatedAt: new Date()
  };

  if (updateDoc.code) {
    updateDoc.code = updateDoc.code.toUpperCase();
  }

  await collections.holidayTypes.updateOne(
    { _id: new mongoose.Types.ObjectId(id) },
    { $set: updateDoc }
  );

  const updated = await collections.holidayTypes.findOne({ _id: new mongoose.Types.ObjectId(id) });

  return sendSuccess(res, updated, 'Holiday type updated successfully');
});

/**
 * @desc    Delete holiday type (soft delete)
 * @route   DELETE /api/holiday-types/:id
 * @access  Private (Admin)
 */
export const deleteHolidayType = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid holiday type ID format');
  }

  const collections = getTenantCollections(user.companyId);

  const holidayType = await collections.holidayTypes.findOne({
    _id: new mongoose.Types.ObjectId(id),
    isDeleted: { $ne: true }
  });

  if (!holidayType) {
    throw buildNotFoundError('Holiday Type', id);
  }

  await collections.holidayTypes.updateOne(
    { _id: new mongoose.Types.ObjectId(id) },
    {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: user.userId
      }
    }
  );

  return sendSuccess(res, {
    _id: holidayType._id,
    isDeleted: true
  }, 'Holiday type deleted successfully');
});

/**
 * @desc    Initialize default holiday types
 * @route   POST /api/holiday-types/initialize
 * @access  Private (Admin, HR)
 */
export const initializeDefaults = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const collections = getTenantCollections(user.companyId);

  // Check if types already exist in tenant DB
  const existingCount = await collections.holidayTypes.countDocuments({ isDeleted: { $ne: true } });
  if (existingCount > 0) {
    return sendSuccess(res, [], `Holiday types already exist for this company (${existingCount} types found)`);
  }

  const defaultTypes = [
    'Public (National) Holidays',
    'State / Regional Holidays',
    'Local Holidays',
    'Religious Holidays',
    'Government Holidays',
    'Company / Organization Holidays',
    'Special / Emergency Holidays',
    'Others'
  ];

  const now = new Date();
  const defaultDocs = defaultTypes.map(name => ({
    name,
    isActive: true,
    isDeleted: false,
    createdBy: user.userId || 'system',
    createdAt: now,
    updatedAt: now,
  }));

  await collections.holidayTypes.insertMany(defaultDocs, { ordered: false });

  const inserted = await collections.holidayTypes
    .find({})
    .sort({ createdAt: 1, name: 1 })
    .toArray();

  return sendSuccess(res, inserted, 'Default holiday types initialized successfully');
});

export default {
  getHolidayTypes,
  getHolidayTypeById,
  createHolidayType,
  updateHolidayType,
  deleteHolidayType,
  initializeDefaults
};
