/**
 * Holiday REST Controller
 * Handles all Holiday CRUD operations via REST API
 */

import {
  buildNotFoundError,
  buildConflictError,
  buildValidationError,
  asyncHandler
} from '../../middleware/errorHandler.js';
import {
  sendSuccess,
  sendCreated,
  extractUser
} from '../../utils/apiResponse.js';
import {
  addHoliday,
  displayHoliday,
  updateHoliday,
  deleteHoliday
} from '../../services/hr/hrm.holidays.js';
import { devLog, devDebug, devWarn, devError } from '../../utils/logger.js';

/**
 * @desc    Get all holidays
 * @route   GET /api/holidays
 * @access  Private
 */
export const getAllHolidays = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  devLog('[Holiday Controller] getAllHolidays - companyId:', user.companyId);

  const result = await displayHoliday(user.companyId);

  devLog('[Holiday Controller] displayHoliday result:', { done: result.done, dataLength: result.data?.length, message: result.message });

  if (!result.done) {
    devError('[Holiday Controller] Error fetching holidays:', result.message);
    throw new Error(result.message || 'Failed to fetch holidays');
  }

  return sendSuccess(res, result.data, 'Holidays retrieved successfully', 200, {
    total: result.data?.length || 0
  });
});

/**
 * @desc    Get single holiday by ID
 * @route   GET /api/holidays/:id
 * @access  Private
 */
export const getHolidayById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  if (!id) {
    throw buildValidationError('id', 'Holiday ID is required');
  }

  // Get all holidays and filter by ID
  const result = await displayHoliday(user.companyId);

  if (!result.done) {
    throw buildConflictError(result.message);
  }

  const holiday = result.data?.find(h => h._id.toString() === id || h._id === id);

  if (!holiday) {
    throw buildNotFoundError('Holiday', id);
  }

  return sendSuccess(res, holiday, 'Holiday retrieved successfully');
});

/**
 * @desc    Create new holiday
 * @route   POST /api/holidays
 * @access  Private (Admin, HR)
 */
export const createHoliday = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const holidayData = req.body;

  const result = await addHoliday(user.companyId, user.userId, holidayData);

  if (!result.done) {
    if (result.errors) {
      throw buildValidationError('fields', result.message, result.errors);
    }
    throw buildConflictError(result.message);
  }

  return sendCreated(res, result.data, 'Holiday created successfully');
});

/**
 * @desc    Update holiday
 * @route   PUT /api/holidays/:id
 * @access  Private (Admin, HR)
 */
export const updateHolidayById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);
  const updateData = req.body;

  if (!id) {
    throw buildValidationError('id', 'Holiday ID is required');
  }

  // Add holidayId to updateData
  updateData.holidayId = id;

  const result = await updateHoliday(user.companyId, user.userId, updateData);

  if (!result.done) {
    if (result.message.includes('not found')) {
      throw buildNotFoundError('Holiday', id);
    }
    if (result.errors) {
      throw buildValidationError('fields', result.message, result.errors);
    }
    throw buildConflictError(result.message);
  }

  return sendSuccess(res, result.data, 'Holiday updated successfully');
});

/**
 * @desc    Delete holiday
 * @route   DELETE /api/holidays/:id
 * @access  Private (Admin)
 */
export const deleteHolidayById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  if (!id) {
    throw buildValidationError('id', 'Holiday ID is required');
  }

  const result = await deleteHoliday(user.companyId, id);

  if (!result.done) {
    if (result.message.includes('not found')) {
      throw buildNotFoundError('Holiday', id);
    }
    throw buildConflictError(result.message);
  }

  return sendSuccess(res, null, 'Holiday deleted successfully');
});

/**
 * @desc    Get holidays by year
 * @route   GET /api/holidays/year/:year
 * @access  Private
 */
export const getHolidaysByYear = asyncHandler(async (req, res) => {
  const { year } = req.params;
  const user = extractUser(req);

  if (!year || isNaN(parseInt(year))) {
    throw buildValidationError('year', 'Valid year is required');
  }

  const result = await displayHoliday(user.companyId);

  if (!result.done) {
    throw buildConflictError(result.message);
  }

  // Filter holidays by year
  const targetYear = parseInt(year);
  const filteredHolidays = result.data?.filter(holiday => {
    const holidayDate = new Date(holiday.date);
    return holidayDate.getFullYear() === targetYear;
  }) || [];

  return sendSuccess(res, filteredHolidays, `Holidays for ${year} retrieved successfully`);
});

/**
 * @desc    Get upcoming holidays
 * @route   GET /api/holidays/upcoming
 * @access  Private
 */
export const getUpcomingHolidays = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  const user = extractUser(req);

  const result = await displayHoliday(user.companyId);

  if (!result.done) {
    throw buildConflictError(result.message);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter holidays after today and sort by date
  const upcomingHolidays = result.data
    ?.filter(holiday => new Date(holiday.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, parseInt(limit)) || [];

  return sendSuccess(res, upcomingHolidays, 'Upcoming holidays retrieved successfully');
});

export default {
  getAllHolidays,
  getHolidayById,
  createHoliday,
  updateHolidayById,
  deleteHolidayById,
  getHolidaysByYear,
  getUpcomingHolidays
};
