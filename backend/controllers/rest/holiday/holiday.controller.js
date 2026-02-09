/**
 * Holiday Controller
 * Handles all holiday CRUD operations and working day calculations
 */

import mongoose from 'mongoose';
import Holiday from '../../../models/holiday/holiday.schema.js';
import HolidayType from '../../../models/holidayType/holidayType.schema.js';
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

const buildHolidayIdQuery = (id, companyId) => {
  const query = {
    companyId,
    isDeleted: false,
    $or: [{ holidayId: id }]
  };

  if (mongoose.Types.ObjectId.isValid(id)) {
    query.$or.push({ _id: new mongoose.Types.ObjectId(id) });
  }

  return query;
};

const toHolidayResponse = (holiday) => {
  const raw = holiday?.toObject ? holiday.toObject() : holiday;
  const holidayType = raw?.holidayTypeId && typeof raw.holidayTypeId === 'object'
    ? raw.holidayTypeId
    : null;

  return {
    _id: raw?._id,
    holidayId: raw?.holidayId,
    title: raw?.name || '',
    name: raw?.name || '',
    date: formatHolidayDate(raw?.date),
    description: raw?.description || '',
    status: raw?.isActive ? 'Active' : 'Inactive',
    holidayTypeId: holidayType?._id || raw?.holidayTypeId || null,
    holidayTypeName: holidayType?.name || raw?.type || '',
    type: raw?.type || '',
    repeatsEveryYear: Boolean(raw?.isRecurring),
    isRecurring: Boolean(raw?.isRecurring),
    isActive: Boolean(raw?.isActive)
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

  const filter = {
    companyId: user.companyId,
    isDeleted: false
  };

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
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const holidays = await Holiday.find(filter)
    .populate('holidayTypeId', 'name')
    .sort({ date: 1 });
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

  const holiday = await Holiday.findOne(buildHolidayIdQuery(id, user.companyId))
    .populate('holidayTypeId', 'name');

  if (!holiday) {
    return res.status(404).json({
      success: false,
      error: { message: 'Holiday not found' }
    });
  }

  res.status(200).json({
    success: true,
    data: toHolidayResponse(holiday)
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

  const holidays = await Holiday.getUpcomingHolidays(user.companyId, parseInt(days))
    .populate('holidayTypeId', 'name');
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

  let holidayType = null;
  if (holidayData.holidayTypeId) {
    if (!mongoose.Types.ObjectId.isValid(holidayData.holidayTypeId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid holiday type ID format' }
      });
    }
    holidayType = await HolidayType.findOne({
      _id: holidayData.holidayTypeId,
      companyId: user.companyId,
      isDeleted: false
    });

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

  // Phase 2.5: Check if holiday already exists for this date (including soft-deleted)
  const existingHoliday = await Holiday.findOne({
    companyId: user.companyId,
    date: parsedDate
  });

  if (existingHoliday) {
    if (existingHoliday.isDeleted) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'A holiday previously existed for this date. Please restore it instead of creating a new one.',
          existingHolidayId: existingHoliday.holidayId
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        error: { message: 'Holiday already exists for this date' }
      });
    }
  }

  const holiday = new Holiday({
    holidayId: generateId('HLD', user.companyId),
    companyId: user.companyId,
    holidayTypeId: holidayType?._id,
    name,
    date: parsedDate,
    type: holidayData.type || 'company',
    isRecurring: holidayData.isRecurring ?? holidayData.repeatsEveryYear ?? false,
    recurringDay: holidayData.recurringDay,
    recurringMonth: holidayData.recurringMonth,
    applicableStates: holidayData.applicableStates || [],
    description: holidayData.description,
    isActive,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const savedHoliday = await holiday.save();
  devLog('[Holiday Controller] Holiday created:', savedHoliday.holidayId);

  const populatedHoliday = await Holiday.findById(savedHoliday._id)
    .populate('holidayTypeId', 'name');

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (broadcastHolidayEvents && broadcastHolidayEvents.created) {
    broadcastHolidayEvents.created(io, user.companyId, {
      holidayId: savedHoliday.holidayId,
      name: savedHoliday.name,
      date: savedHoliday.date
    });
  }

  res.status(201).json({
    success: true,
    data: toHolidayResponse(populatedHoliday || savedHoliday),
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

  const holiday = await Holiday.findOne(buildHolidayIdQuery(id, user.companyId));

  if (!holiday) {
    return res.status(404).json({
      success: false,
      error: { message: 'Holiday not found' }
    });
  }

  // Check if another holiday exists for the new date
  if (parsedDate && parsedDate.toISOString() !== holiday.date.toISOString()) {
    const existingHoliday = await Holiday.findOne({
      companyId: user.companyId,
      date: parsedDate,
      _id: { $ne: holiday._id },
      isDeleted: false
    });

    if (existingHoliday) {
      return res.status(400).json({
        success: false,
        error: { message: 'Holiday already exists for this date' }
      });
    }
  }

  // Update fields
  if (normalizedName) holiday.name = normalizedName;
  if (parsedDate) holiday.date = parsedDate;
  if (updateData.type !== undefined) holiday.type = updateData.type;
  if (updateData.isRecurring !== undefined) holiday.isRecurring = updateData.isRecurring;
  if (updateData.repeatsEveryYear !== undefined) holiday.isRecurring = updateData.repeatsEveryYear;
  if (updateData.recurringDay !== undefined) holiday.recurringDay = updateData.recurringDay;
  if (updateData.recurringMonth !== undefined) holiday.recurringMonth = updateData.recurringMonth;
  if (updateData.applicableStates !== undefined) holiday.applicableStates = updateData.applicableStates;
  if (updateData.description !== undefined) holiday.description = updateData.description;
  if (updateData.status !== undefined) {
    const statusValue = typeof updateData.status === 'string'
      ? updateData.status.toLowerCase() !== 'inactive'
      : Boolean(updateData.status);
    holiday.isActive = statusValue;
  }
  if (updateData.isActive !== undefined) holiday.isActive = updateData.isActive;

  if (updateData.holidayTypeId) {
    if (!mongoose.Types.ObjectId.isValid(updateData.holidayTypeId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid holiday type ID format' }
      });
    }
    const holidayType = await HolidayType.findOne({
      _id: updateData.holidayTypeId,
      companyId: user.companyId,
      isDeleted: false
    });

    if (!holidayType) {
      return res.status(400).json({
        success: false,
        error: { message: 'Holiday type not found' }
      });
    }
    holiday.holidayTypeId = holidayType._id;
  }

  holiday.updatedAt = new Date();
  const updatedHoliday = await holiday.save();

  devLog('[Holiday Controller] Holiday updated:', updatedHoliday.holidayId);

  const populatedHoliday = await Holiday.findById(updatedHoliday._id)
    .populate('holidayTypeId', 'name');

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (broadcastHolidayEvents && broadcastHolidayEvents.updated) {
    broadcastHolidayEvents.updated(io, user.companyId, {
      holidayId: updatedHoliday.holidayId,
      name: updatedHoliday.name,
      date: updatedHoliday.date
    });
  }

  res.status(200).json({
    success: true,
    data: toHolidayResponse(populatedHoliday || updatedHoliday),
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

  const holiday = await Holiday.findOne(buildHolidayIdQuery(id, user.companyId));

  if (!holiday) {
    return res.status(404).json({
      success: false,
      error: { message: 'Holiday not found' }
    });
  }

  holiday.isDeleted = true;
  holiday.isActive = false;
  holiday.updatedAt = new Date();
  const deletedHoliday = await holiday.save();

  devLog('[Holiday Controller] Holiday soft deleted:', deletedHoliday.holidayId);

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (broadcastHolidayEvents && broadcastHolidayEvents.deleted) {
    broadcastHolidayEvents.deleted(io, user.companyId, {
      holidayId: deletedHoliday.holidayId,
      name: deletedHoliday.name
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

  const startDate = new Date(parseInt(year), 0, 1);
  const endDate = new Date(parseInt(year), 11, 31);

  const holidays = await Holiday.find({
    companyId: user.companyId,
    date: { $gte: startDate, $lte: endDate },
    isActive: true,
    isDeleted: false
  });

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
