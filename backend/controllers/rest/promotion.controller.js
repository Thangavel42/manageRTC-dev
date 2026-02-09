/**
 * Promotion REST Controller
 * Handles all Promotion CRUD operations via REST API
 * Uses multi-tenant database architecture with getTenantCollections()
 */

import { ObjectId } from 'mongodb';
import { getTenantCollections } from '../../config/db.js';
import {
  buildNotFoundError,
  buildConflictError,
  buildValidationError,
  asyncHandler
} from '../../middleware/errorHandler.js';
import {
  sendSuccess,
  sendCreated,
  buildPagination,
  extractUser
} from '../../utils/apiResponse.js';
import { broadcastPromotionEvents, getSocketIO } from '../../utils/socketBroadcaster.js';
import logger from '../../utils/logger.js';

/**
 * @desc    Get all promotions
 * @route   GET /api/promotions
 * @access  Private
 */
export const getPromotions = asyncHandler(async (req, res) => {
  const { page, limit, status, type, departmentId, employeeId, sortBy, order } = req.query;
  const user = extractUser(req);

  logger.debug('[Promotion Controller] getPromotions called', { companyId: user.companyId, userId: user.userId });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Build filter
  const filter = {
    isDeleted: { $ne: true }
  };

  // Apply status filter
  if (status) {
    filter.status = status;
  }

  // Apply type filter
  if (type) {
    filter.promotionType = type;
  }

  // Apply department filter
  if (departmentId) {
    filter['promotionTo.departmentId'] = departmentId;
  }

  // Apply employee filter
  if (employeeId) {
    filter.employeeId = employeeId;
  }

  // Get total count
  const total = await collections.promotions.countDocuments(filter);

  // Build sort option
  const sort = {};
  if (sortBy) {
    sort[sortBy] = order === 'asc' ? 1 : -1;
  } else {
    sort.promotionDate = -1;
  }

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;
  const skip = (pageNum - 1) * limitNum;

  const promotions = await collections.promotions
    .find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limitNum)
    .toArray();

  const pagination = buildPagination(pageNum, limitNum, total);

  return sendSuccess(res, promotions, 'Promotions retrieved successfully', 200, pagination);
});

/**
 * @desc    Get single promotion by ID
 * @route   GET /api/promotions/:id
 * @access  Private
 */
export const getPromotionById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid promotion ID format');
  }

  logger.debug('[Promotion Controller] getPromotionById called', { id, companyId: user.companyId });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  const promotion = await collections.promotions.findOne({
    _id: new ObjectId(id),
    isDeleted: { $ne: true }
  });

  if (!promotion) {
    throw buildNotFoundError('Promotion', id);
  }

  return sendSuccess(res, promotion);
});

/**
 * @desc    Create new promotion
 * @route   POST /api/promotions
 * @access  Private (Admin, HR)
 */
export const createPromotion = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const promotionData = req.body;
  const io = getSocketIO(req);

  logger.debug('[Promotion Controller] createPromotion called', { companyId: user.companyId, userId: user.userId });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Validate required fields
  if (!promotionData.employeeId || !promotionData.promotionTo?.departmentId || !promotionData.promotionTo?.designationId) {
    throw buildValidationError('fields', 'Employee ID and target department/designation are required');
  }

  if (!promotionData.promotionDate) {
    throw buildValidationError('promotionDate', 'Promotion date is required');
  }

  // Check for overlapping pending promotions
  const existingPromotion = await collections.promotions.findOne({
    employeeId: promotionData.employeeId,
    status: 'pending',
    isDeleted: { $ne: true }
  });

  if (existingPromotion) {
    throw buildConflictError('Employee already has a pending promotion');
  }

  // Get current employee data to store current position
  const employee = await collections.employees.findOne({
    employeeId: promotionData.employeeId
  });

  if (!employee) {
    throw buildNotFoundError('Employee', promotionData.employeeId);
  }

  // Prepare promotion data with current position
  const promotionToInsert = {
    ...promotionData,
    companyId: user.companyId,
    promotionFrom: {
      departmentId: employee.departmentId,
      designationId: employee.designationId
    },
    salaryChange: promotionData.salaryChange || null,
    status: 'pending',
    isDeleted: false,
    createdBy: {
      userId: user.userId,
      userName: user.userName || user.fullName || user.name || ''
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await collections.promotions.insertOne(promotionToInsert);

  if (!result.insertedId) {
    throw new Error('Failed to create promotion');
  }

  // Get the created promotion
  let promotion = await collections.promotions.findOne({ _id: result.insertedId });

  // Check if promotion should be applied immediately
  const isDue = new Date(promotionData.promotionDate) <= new Date();

  if (isDue) {
    // Apply promotion immediately - update employee record
    const updateData = {
      departmentId: promotionData.promotionTo.departmentId,
      designationId: promotionData.promotionTo.designationId,
      updatedAt: new Date()
    };

    // Update salary if provided
    if (promotionData.salaryChange?.newSalary) {
      updateData['salary.basic'] = promotionData.salaryChange.newSalary;
    }

    await collections.employees.updateOne(
      { employeeId: promotionData.employeeId },
      { $set: updateData }
    );

    // Update promotion status
    await collections.promotions.updateOne(
      { _id: result.insertedId },
      {
        $set: {
          status: 'applied',
          appliedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

    promotion = await collections.promotions.findOne({ _id: result.insertedId });

    // Broadcast promotion applied event
    if (io) {
      const updatedEmployee = await collections.employees.findOne({
        employeeId: promotionData.employeeId
      });
      broadcastPromotionEvents.applied(io, user.companyId, promotion, updatedEmployee);
    }
  } else {
    // Broadcast promotion created event
    if (io) {
      broadcastPromotionEvents.created(io, user.companyId, promotion);
    }
  }

  return sendCreated(res, promotion, 'Promotion created successfully');
});

/**
 * @desc    Update promotion
 * @route   PUT /api/promotions/:id
 * @access  Private (Admin, HR)
 */
export const updatePromotion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);
  const updateData = req.body;
  const io = getSocketIO(req);

  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid promotion ID format');
  }

  logger.debug('[Promotion Controller] updatePromotion called', { id, companyId: user.companyId });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  const promotion = await collections.promotions.findOne({
    _id: new ObjectId(id),
    isDeleted: { $ne: true }
  });

  if (!promotion) {
    throw buildNotFoundError('Promotion', id);
  }

  // Cannot update applied promotions
  if (promotion.status === 'applied') {
    throw buildConflictError('Cannot update an applied promotion');
  }

  // Build update object
  const updateObj = {
    ...updateData,
    updatedBy: {
      userId: user.userId,
      userName: user.userName || user.fullName || user.name || ''
    },
    updatedAt: new Date()
  };

  const result = await collections.promotions.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateObj }
  );

  if (result.matchedCount === 0) {
    throw buildNotFoundError('Promotion', id);
  }

  // Get updated promotion
  const updatedPromotion = await collections.promotions.findOne({ _id: new ObjectId(id) });

  // Broadcast promotion updated event
  if (io) {
    broadcastPromotionEvents.updated(io, user.companyId, updatedPromotion);
  }

  return sendSuccess(res, updatedPromotion, 'Promotion updated successfully');
});

/**
 * @desc    Delete promotion (soft delete)
 * @route   DELETE /api/promotions/:id
 * @access  Private (Admin)
 */
export const deletePromotion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);
  const io = getSocketIO(req);

  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid promotion ID format');
  }

  logger.debug('[Promotion Controller] deletePromotion called', { id, companyId: user.companyId });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  const promotion = await collections.promotions.findOne({
    _id: new ObjectId(id),
    isDeleted: { $ne: true }
  });

  if (!promotion) {
    throw buildNotFoundError('Promotion', id);
  }

  // Soft delete
  const result = await collections.promotions.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: {
          userId: user.userId,
          userName: user.userName || user.fullName || user.name || ''
        }
      }
    }
  );

  if (result.matchedCount === 0) {
    throw buildNotFoundError('Promotion', id);
  }

  // Broadcast promotion deleted event
  if (io) {
    broadcastPromotionEvents.deleted(io, user.companyId, id, {
      userId: user.userId,
      userName: user.userName || user.fullName || user.name || ''
    });
  }

  return sendSuccess(res, {
    _id: promotion._id,
    isDeleted: true
  }, 'Promotion deleted successfully');
});

/**
 * @desc    Apply promotion
 * @route   PUT /api/promotions/:id/apply
 * @access  Private (Admin, HR)
 */
export const applyPromotion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);
  const io = getSocketIO(req);

  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid promotion ID format');
  }

  logger.debug('[Promotion Controller] applyPromotion called', { id, companyId: user.companyId });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  const promotion = await collections.promotions.findOne({
    _id: new ObjectId(id),
    isDeleted: { $ne: true }
  });

  if (!promotion) {
    throw buildNotFoundError('Promotion', id);
  }

  // Get employee before update
  const employee = await collections.employees.findOne({
    employeeId: promotion.employeeId
  });

  if (!employee) {
    throw buildNotFoundError('Employee', promotion.employeeId);
  }

  // Build update object for employee
  const updateData = {
    departmentId: promotion.promotionTo.departmentId,
    designationId: promotion.promotionTo.designationId,
    updatedAt: new Date()
  };

  // Update salary if salary change is specified
  if (promotion.salaryChange?.newSalary) {
    updateData['salary.basic'] = promotion.salaryChange.newSalary;
  }

  // Apply promotion - update employee record
  await collections.employees.updateOne(
    { employeeId: promotion.employeeId },
    { $set: updateData }
  );

  // Update promotion status
  await collections.promotions.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status: 'applied',
        appliedAt: new Date(),
        updatedAt: new Date()
      }
    }
  );

  // Get updated promotion and employee
  const updatedPromotion = await collections.promotions.findOne({ _id: new ObjectId(id) });
  const updatedEmployee = await collections.employees.findOne({
    employeeId: promotion.employeeId
  });

  // Broadcast promotion applied event
  if (io) {
    broadcastPromotionEvents.applied(io, user.companyId, updatedPromotion, updatedEmployee);
  }

  return sendSuccess(res, updatedPromotion, 'Promotion applied successfully');
});

/**
 * @desc    Cancel promotion
 * @route   PUT /api/promotions/:id/cancel
 * @access  Private (Admin, HR)
 */
export const cancelPromotion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const user = extractUser(req);
  const io = getSocketIO(req);

  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid promotion ID format');
  }

  logger.debug('[Promotion Controller] cancelPromotion called', { id, companyId: user.companyId });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  const promotion = await collections.promotions.findOne({
    _id: new ObjectId(id),
    isDeleted: { $ne: true }
  });

  if (!promotion) {
    throw buildNotFoundError('Promotion', id);
  }

  // Update promotion status
  const updateObj = {
    status: 'cancelled',
    cancellationReason: reason || '',
    updatedAt: new Date()
  };

  await collections.promotions.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateObj }
  );

  // Get updated promotion
  const updatedPromotion = await collections.promotions.findOne({ _id: new ObjectId(id) });

  // Broadcast promotion cancelled event
  if (io) {
    broadcastPromotionEvents.cancelled(io, user.companyId, updatedPromotion);
  }

  return sendSuccess(res, updatedPromotion, 'Promotion cancelled successfully');
});

/**
 * @desc    Get departments for promotion selection
 * @route   GET /api/promotions/departments
 * @access  Private
 */
export const getDepartments = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  logger.debug('[Promotion Controller] getDepartments called', { companyId: user.companyId, userId: user.userId });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Get unique department IDs from employees
  const employees = await collections.employees.find({
    status: 'Active',
    isDeleted: { $ne: true }
  }).toArray();

  const departmentIds = [...new Set(employees
    .map(e => e.departmentId)
    .filter(id => id)
  )];

  // Get department details
  const departments = await collections.departments.find({
    _id: { $in: departmentIds.map(id => new ObjectId(id)) }
  }).toArray();

  return sendSuccess(res, departments, 'Departments retrieved successfully');
});

/**
 * @desc    Get designations for promotion selection
 * @route   GET /api/promotions/designations
 * @access  Private
 */
export const getDesignationsForPromotion = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const { departmentId } = req.query;

  logger.debug('[Promotion Controller] getDesignationsForPromotion called', { companyId: user.companyId, userId: user.userId });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  const filter = {
    status: 'Active',
    isDeleted: { $ne: true }
  };

  if (departmentId) {
    filter.departmentId = departmentId;
  }

  const employees = await collections.employees.find(filter).toArray();

  const designationIds = [...new Set(employees
    .map(e => e.designationId)
    .filter(id => id)
  )];

  // Get designation details
  const designations = await collections.designations.find({
    _id: { $in: designationIds.map(id => new ObjectId(id)) }
  }).toArray();

  return sendSuccess(res, designations, 'Designations retrieved successfully');
});

/**
 * @desc    Get promotion statistics
 * @route   GET /api/promotions/stats
 * @access  Private (Admin, HR, Superadmin)
 */
export const getPromotionStats = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  logger.debug('[Promotion Controller] getPromotionStats called', { companyId: user.companyId, userId: user.userId });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Count promotions by status
  const total = await collections.promotions.countDocuments({ isDeleted: { $ne: true } });
  const pending = await collections.promotions.countDocuments({ status: 'pending', isDeleted: { $ne: true } });
  const approved = await collections.promotions.countDocuments({ status: 'approved', isDeleted: { $ne: true } });
  const applied = await collections.promotions.countDocuments({ status: 'applied', isDeleted: { $ne: true } });
  const cancelled = await collections.promotions.countDocuments({ status: 'cancelled', isDeleted: { $ne: true } });

  // Count due promotions (pending promotions with promotionDate in the past)
  const due = await collections.promotions.countDocuments({
    status: 'pending',
    promotionDate: { $lte: new Date() },
    isDeleted: { $ne: true }
  });

  const stats = {
    total,
    pending,
    approved,
    applied,
    cancelled,
    due
  };

  return sendSuccess(res, stats, 'Promotion statistics retrieved successfully');
});

export default {
  getPromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  deletePromotion,
  applyPromotion,
  cancelPromotion,
  getDepartments,
  getDesignationsForPromotion,
  getPromotionStats
};
