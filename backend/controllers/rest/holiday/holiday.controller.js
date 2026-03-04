/**
 * Holiday Controller
 * Handles all holiday CRUD operations and working day calculations
 * MULTI-TENANT: Uses company-specific MongoDB collections via getTenantCollections()
 */

import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';
import Holiday from '../../../models/holiday/holiday.schema.js';
import HolidayType from '../../../models/holidayType/holidayType.schema.js';
import { getTenantCollections } from '../../../config/db.js';
import { extractUser } from '../../../utils/apiResponse.js';
import asyncHandler from '../../../utils/asyncHandler.js';
import { generateId } from '../../../utils/idGenerator.js';
import {
    calculateWorkingDays,
    checkWorkingDay,
    validateLeaveDates
} from '../../../utils/leaveDaysCalculator.js';
import { broadcastHolidayEvents, getSocketIO } from '../../../utils/socketBroadcaster.js';
import { devLog, devDebug, devWarn, devError } from '../../../utils/logger.js';

const DATE_FORMAT_REGEX = /^\d{2}-\d{2}-\d{4}$/;

/**
 * Resolve holiday type - checks both Mongoose model and tenant collection
 */
const resolveHolidayType = async (holidayTypeId, companyId) => {
  if (!mongoose.Types.ObjectId.isValid(holidayTypeId)) {
    return { error: 'Invalid holiday type ID format' };
  }

  const objectId = new ObjectId(holidayTypeId);

  // First try the tenant collection (correct location)
  const collections = getTenantCollections(companyId);
  const tenantType = await collections.holidayTypes.findOne({
    _id: objectId,
    isDeleted: { $ne: true }
  });

  if (tenantType) {
    return { holidayType: tenantType };
  }

  // Fallback to Mongoose model (for backward compatibility with superadmin data)
  const modelType = await HolidayType.findOne({
    _id: new mongoose.Types.ObjectId(holidayTypeId),
    companyId,
    isDeleted: false
  });

  if (modelType) {
    return { holidayType: modelType };
  }

  return { holidayType: null };
};

const parseHolidayDate = (value) => {
  if (typeof value !== 'string' || !DATE_FORMAT_REGEX.test(value)) {
    return null;
  }

  const [day, month, year] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
};

const formatHolidayDate = (value) => {
  if (!(value instanceof Date)) {
    return value || '';
  }
  const day = String(value.getDate()).padStart(2, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const year = value.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Build query for finding holiday by ID (supports both _id and holidayId)
 */
const buildHolidayIdQuery = (id) => {
  if (ObjectId.isValid(id)) {
    return { _id: new ObjectId(id) };
  }
  // For legacy support - if using holidayId string
  return { holidayId: id };
};

const toHolidayResponse = (holiday) => {
  const raw = holiday || {};
  const holidayType = raw?.holidayTypeId && typeof raw.holidayTypeId === 'object'
    ? raw.holidayTypeId
    : null;

  return {
    _id: raw?._id?.toString() || raw?._id,
    holidayId: raw?.holidayId,
    title: raw?.name || raw?.title || '',
    name: raw?.name || raw?.title || '',
    date: formatHolidayDate(raw?.date),
    description: raw?.description || '',
    status: raw?.isActive ? 'Active' : (raw?.status === 'Inactive' ? 'Inactive' : (raw?.isActive === false ? 'Inactive' : 'Active')),
    holidayTypeId: holidayType?._id?.toString() || raw?.holidayTypeId?.toString() || null,
    holidayTypeName: holidayType?.name || raw?.holidayTypeName || raw?.type || '',
    type: raw?.type || '',
    repeatsEveryYear: Boolean(raw?.isRecurring || raw?.repeatsEveryYear),
    isRecurring: Boolean(raw?.isRecurring || raw?.repeatsEveryYear),
    isActive: raw?.isActive !== undefined ? raw.isActive : (raw?.status !== 'Inactive')
  };
};

/**
 * @desc    Get all holidays for a company with optional filtering
 * @route   GET /api/holidays
 * @access  Private
 */
export const getHolidays = asyncHandler(async (req, res) => {
  const { year, month, type, search, status } = req.query;
  const user = extractUser(req);

  const collections = getTenantCollections(user.companyId);

  // Build filter for tenant collection
  const filter = {};

  // Filter by status only when explicitly requested
  if (status) {
    const normalizedStatus = String(status).toLowerCase();
    if (normalizedStatus === 'active') {
      filter.isActive = true;
    } else if (normalizedStatus === 'inactive') {
      filter.isActive = false;
    }
  }

  // Filter by year
  if (year) {
    const startDate = new Date(parseInt(year), 0, 1);
    const endDate = new Date(parseInt(year), 11, 31);
    filter.date = { $gte: startDate, $lte: endDate };
  }

  // Filter by month
  if (month) {
    const currentYear = year ? parseInt(year) : new Date().getFullYear();
    const startDate = new Date(currentYear, parseInt(month) - 1, 1);
    const endDate = new Date(currentYear, parseInt(month), 0);
    filter.date = { $gte: startDate, $lte: endDate };
  }

  // Filter by type
  if (type) {
    filter.type = type;
  }

  // Search by name
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  // Use aggregation to join with holidayTypes
  const pipeline = [
    { $match: filter },
    {
      $lookup: {
        from: 'holidayTypes',
        localField: 'holidayTypeId',
        foreignField: '_id',
        as: 'holidayTypeData'
      }
    },
    {
      $addFields: {
        holidayTypeName: {
          $ifNull: [
            { $arrayElemAt: ['$holidayTypeData.name', 0] },
            ''
          ]
        }
      }
    },
    {
      $project: {
        holidayTypeData: 0
      }
    },
    { $sort: { date: 1 } }
  ];

  const holidays = await collections.holidays.aggregate(pipeline).toArray();
  const normalized = holidays.map(toHolidayResponse);

  res.status(200).json({
    success: true,
    data: normalized,
    count: normalized.length
  });
});

/**
 * @desc    Get holiday by ID
 * @route   GET /api/holidays/:id
 * @access  Private
 */
export const getHolidayById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  const collections = getTenantCollections(user.companyId);
  const query = buildHolidayIdQuery(id);

  const pipeline = [
    { $match: query },
    {
      $lookup: {
        from: 'holidayTypes',
        localField: 'holidayTypeId',
        foreignField: '_id',
        as: 'holidayTypeData'
      }
    },
    {
      $addFields: {
        holidayTypeName: {
          $ifNull: [
            { $arrayElemAt: ['$holidayTypeData.name', 0] },
            ''
          ]
        }
      }
    },
    {
      $project: {
        holidayTypeData: 0
      }
    }
  ];

  const holidays = await collections.holidays.aggregate(pipeline).toArray();

  if (!holidays || holidays.length === 0) {
    return res.status(404).json({
      success: false,
      error: { message: 'Holiday not found' }
    });
  }

  res.status(200).json({
    success: true,
    data: toHolidayResponse(holidays[0])
  });
});

/**
 * @desc    Get upcoming holidays
 * @route   GET /api/holidays/upcoming
 * @access  Private
 */
export const getUpcomingHolidaysHandler = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const user = extractUser(req);

  const collections = getTenantCollections(user.companyId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + parseInt(days));

  const pipeline = [
    {
      $match: {
        date: { $gte: today, $lte: futureDate },
        isActive: true
      }
    },
    {
      $lookup: {
        from: 'holidayTypes',
        localField: 'holidayTypeId',
        foreignField: '_id',
        as: 'holidayTypeData'
      }
    },
    {
      $addFields: {
        holidayTypeName: {
          $ifNull: [
            { $arrayElemAt: ['$holidayTypeData.name', 0] },
            ''
          ]
        }
      }
    },
    {
      $project: {
        holidayTypeData: 0
      }
    },
    { $sort: { date: 1 } }
  ];

  const holidays = await collections.holidays.aggregate(pipeline).toArray();
  const normalized = holidays.map(toHolidayResponse);

  res.status(200).json({
    success: true,
    data: normalized,
    count: normalized.length
  });
});

/**
 * @desc    Create new holiday
 * @route   POST /api/holidays
 * @access  Private (Admin, HR)
 */
export const createHoliday = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const holidayData = req.body;

  // Normalize incoming payload (UI sends `title`/`status` instead of `name`/`isActive`)
  const name = (holidayData.name || holidayData.title || '').trim();
  const rawDate = holidayData.date || holidayData.holidayDate;
  const parsedDate = parseHolidayDate(rawDate);

  if (!name) {
    return res.status(400).json({
      success: false,
      error: { message: 'Holiday name/title is required' }
    });
  }

  if (!rawDate) {
    return res.status(400).json({
      success: false,
      error: { message: 'Holiday date is required' }
    });
  }

  if (!parsedDate) {
    return res.status(400).json({
      success: false,
      error: { message: 'Holiday date must be in DD-MM-YYYY format' }
    });
  }

  const isActive = holidayData.status !== undefined
    ? (typeof holidayData.status === 'string'
        ? holidayData.status.toLowerCase() !== 'inactive'
        : Boolean(holidayData.status))
    : true;

  const collections = getTenantCollections(user.companyId);

  // Resolve holiday type
  let holidayType = null;
  if (holidayData.holidayTypeId) {
    const resolved = await resolveHolidayType(holidayData.holidayTypeId, user.companyId);
    if (resolved.error) {
      return res.status(400).json({
        success: false,
        error: { message: resolved.error }
      });
    }
    holidayType = resolved.holidayType;

    if (!holidayType) {
      return res.status(400).json({
        success: false,
        error: { message: 'Holiday type not found' }
      });
    }
  }

  if (!holidayType && !holidayData.type) {
    return res.status(400).json({
      success: false,
      error: { message: 'Holiday type is required' }
    });
  }

  // Check if holiday already exists for this date
  const existingHoliday = await collections.holidays.findOne({
    date: parsedDate
  });

  if (existingHoliday) {
    return res.status(400).json({
      success: false,
      error: { message: 'Holiday already exists for this date' }
    });
  }

  const holidayDocument = {
    holidayId: generateId('HLD', user.companyId),
    name,
    date: parsedDate,
    type: holidayData.type || holidayType?.name || 'company',
    holidayTypeId: holidayType ? new ObjectId(holidayType._id) : null,
    isRecurring: holidayData.isRecurring ?? holidayData.repeatsEveryYear ?? false,
    recurringDay: holidayData.recurringDay,
    recurringMonth: holidayData.recurringMonth,
    applicableStates: holidayData.applicableStates || [],
    description: holidayData.description,
    isActive,
    createdBy: user.userId,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await collections.holidays.insertOne(holidayDocument);
  devLog('[Holiday Controller] Holiday created:', result.insertedId);

  // Fetch the created holiday with type lookup
  const pipeline = [
    { $match: { _id: result.insertedId } },
    {
      $lookup: {
        from: 'holidayTypes',
        localField: 'holidayTypeId',
        foreignField: '_id',
        as: 'holidayTypeData'
      }
    },
    {
      $addFields: {
        holidayTypeName: {
          $ifNull: [
            { $arrayElemAt: ['$holidayTypeData.name', 0] },
            ''
          ]
        }
      }
    },
    {
      $project: {
        holidayTypeData: 0
      }
    }
  ];

  const createdHolidays = await collections.holidays.aggregate(pipeline).toArray();

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (broadcastHolidayEvents && broadcastHolidayEvents.created) {
    broadcastHolidayEvents.created(io, user.companyId, {
      holidayId: holidayDocument.holidayId,
      name: holidayDocument.name,
      date: holidayDocument.date
    });
  }

  res.status(201).json({
    success: true,
    data: toHolidayResponse(createdHolidays[0]),
    message: 'Holiday created successfully'
  });
});

/**
 * @desc    Update holiday
 * @route   PUT /api/holidays/:id
 * @access  Private (Admin, HR)
 */
export const updateHoliday = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);
  const updateData = req.body;

  const collections = getTenantCollections(user.companyId);
  const query = buildHolidayIdQuery(id);

  // Check if holiday exists
  const existingHoliday = await collections.holidays.findOne(query);
  if (!existingHoliday) {
    return res.status(404).json({
      success: false,
      error: { message: 'Holiday not found' }
    });
  }

  // Normalize incoming payload fields
  const normalizedName = (updateData.name || updateData.title || '').trim();
  const rawDate = updateData.date || updateData.holidayDate;
  const parsedDate = rawDate ? parseHolidayDate(rawDate) : null;

  if (rawDate && !parsedDate) {
    return res.status(400).json({
      success: false,
      error: { message: 'Holiday date must be in DD-MM-YYYY format' }
    });
  }

  // Check if another holiday exists for the new date
  if (parsedDate && new Date(parsedDate).getTime() !== new Date(existingHoliday.date).getTime()) {
    const duplicateHoliday = await collections.holidays.findOne({
      date: parsedDate,
      _id: { $ne: existingHoliday._id }
    });

    if (duplicateHoliday) {
      return res.status(400).json({
        success: false,
        error: { message: 'Holiday already exists for this date' }
      });
    }
  }

  // Build update document
  const updateDoc = { updatedAt: new Date() };

  if (normalizedName) updateDoc.name = normalizedName;
  if (parsedDate) updateDoc.date = parsedDate;
  if (updateData.type !== undefined) updateDoc.type = updateData.type;
  if (updateData.description !== undefined) updateDoc.description = updateData.description;
  if (updateData.isRecurring !== undefined) updateDoc.isRecurring = updateData.isRecurring;
  if (updateData.repeatsEveryYear !== undefined) updateDoc.isRecurring = updateData.repeatsEveryYear;
  if (updateData.recurringDay !== undefined) updateDoc.recurringDay = updateData.recurringDay;
  if (updateData.recurringMonth !== undefined) updateDoc.recurringMonth = updateData.recurringMonth;
  if (updateData.applicableStates !== undefined) updateDoc.applicableStates = updateData.applicableStates;
  if (updateData.status !== undefined) {
    const statusValue = typeof updateData.status === 'string'
      ? updateData.status.toLowerCase() !== 'inactive'
      : Boolean(updateData.status);
    updateDoc.isActive = statusValue;
  }
  if (updateData.isActive !== undefined) updateDoc.isActive = updateData.isActive;

  if (updateData.holidayTypeId) {
    const resolved = await resolveHolidayType(updateData.holidayTypeId, user.companyId);
    if (resolved.error) {
      return res.status(400).json({
        success: false,
        error: { message: resolved.error }
      });
    }
    if (!resolved.holidayType) {
      return res.status(400).json({
        success: false,
        error: { message: 'Holiday type not found' }
      });
    }
    updateDoc.holidayTypeId = new ObjectId(resolved.holidayType._id);
  }

  const result = await collections.holidays.updateOne(query, { $set: updateDoc });

  if (result.matchedCount === 0) {
    return res.status(404).json({
      success: false,
      error: { message: 'Holiday not found' }
    });
  }

  devLog('[Holiday Controller] Holiday updated:', id);

  // Fetch updated holiday with type lookup
  const pipeline = [
    { $match: query },
    {
      $lookup: {
        from: 'holidayTypes',
        localField: 'holidayTypeId',
        foreignField: '_id',
        as: 'holidayTypeData'
      }
    },
    {
      $addFields: {
        holidayTypeName: {
          $ifNull: [
            { $arrayElemAt: ['$holidayTypeData.name', 0] },
            ''
          ]
        }
      }
    },
    {
      $project: {
        holidayTypeData: 0
      }
    }
  ];

  const updatedHolidays = await collections.holidays.aggregate(pipeline).toArray();

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (broadcastHolidayEvents && broadcastHolidayEvents.updated) {
    broadcastHolidayEvents.updated(io, user.companyId, {
      holidayId: existingHoliday.holidayId || id,
      name: updateDoc.name || existingHoliday.name,
      date: updateDoc.date || existingHoliday.date
    });
  }

  res.status(200).json({
    success: true,
    data: toHolidayResponse(updatedHolidays[0] || existingHoliday),
    message: 'Holiday updated successfully'
  });
});

/**
 * @desc    Delete holiday (soft delete)
 * @route   DELETE /api/holidays/:id
 * @access  Private (Admin, HR)
 */
export const deleteHoliday = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  const collections = getTenantCollections(user.companyId);
  const query = buildHolidayIdQuery(id);

  const holiday = await collections.holidays.findOne(query);

  if (!holiday) {
    return res.status(404).json({
      success: false,
      error: { message: 'Holiday not found' }
    });
  }

  // Soft delete
  await collections.holidays.updateOne(query, {
    $set: {
      isDeleted: true,
      isActive: false,
      updatedAt: new Date()
    }
  });

  devLog('[Holiday Controller] Holiday soft deleted:', id);

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (broadcastHolidayEvents && broadcastHolidayEvents.deleted) {
    broadcastHolidayEvents.deleted(io, user.companyId, {
      holidayId: holiday.holidayId || id,
      name: holiday.name
    });
  }

  res.status(200).json({
    success: true,
    data: { holidayId: id, isDeleted: true },
    message: 'Holiday deleted successfully'
  });
});

/**
 * @desc    Calculate working days for a date range
 * @route   POST /api/holidays/calculate
 * @access  Private
 */
export const calculateDaysHandler = asyncHandler(async (req, res) => {
  const { startDate, endDate, state } = req.body;
  const user = extractUser(req);

  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      error: { message: 'Start date and end date are required' }
    });
  }

  try {
    const result = await calculateWorkingDays(
      user.companyId,
      new Date(startDate),
      new Date(endDate),
      state
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * @desc    Check if a specific date is a working day
 * @route   GET /api/holidays/check
 * @access  Private
 */
export const checkWorkingDayHandler = asyncHandler(async (req, res) => {
  const { date, state } = req.query;
  const user = extractUser(req);

  if (!date) {
    return res.status(400).json({
      success: false,
      error: { message: 'Date is required' }
    });
  }

  try {
    const result = await checkWorkingDay(user.companyId, new Date(date));

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * @desc    Validate leave request dates
 * @route   POST /api/holidays/validate
 * @access  Private
 */
export const validateLeaveDatesHandler = asyncHandler(async (req, res) => {
  const { startDate, endDate, employeeId } = req.body;
  const user = extractUser(req);

  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      error: { message: 'Start date and end date are required' }
    });
  }

  try {
    const result = await validateLeaveDates(
      user.companyId,
      new Date(startDate),
      new Date(endDate),
      employeeId
    );

    res.status(200).json({
      success: true,
      data: result,
      message: 'Dates validated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * @desc    Get holiday statistics
 * @route   GET /api/holidays/stats
 * @access  Private (Admin, HR)
 */
export const getHolidayStats = asyncHandler(async (req, res) => {
  const { year = new Date().getFullYear() } = req.query;
  const user = extractUser(req);

  const collections = getTenantCollections(user.companyId);

  const startDate = new Date(parseInt(year), 0, 1);
  const endDate = new Date(parseInt(year), 11, 31);

  const holidays = await collections.holidays.find({
    date: { $gte: startDate, $lte: endDate },
    isActive: true
  }).toArray();

  const stats = {
    total: holidays.length,
    public: holidays.filter(h => h.type === 'public').length,
    company: holidays.filter(h => h.type === 'company').length,
    optional: holidays.filter(h => h.type === 'optional').length,
    recurring: holidays.filter(h => h.isRecurring).length,
    byMonth: {}
  };

  // Group by month
  holidays.forEach(holiday => {
    const month = holiday.date.getMonth();
    const monthName = new Date(parseInt(year), month, 1).toLocaleString('default', { month: 'long' });
    stats.byMonth[monthName] = (stats.byMonth[monthName] || 0) + 1;
  });

  res.status(200).json({
    success: true,
    data: stats
  });
});

export default {
  getHolidays,
  getHolidayById,
  getUpcomingHolidaysHandler,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  calculateDaysHandler,
  checkWorkingDayHandler,
  validateLeaveDatesHandler,
  getHolidayStats
};
