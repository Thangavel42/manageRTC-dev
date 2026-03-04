/**
 * Holiday Routes
 * REST API endpoints for holiday management
 */

import express from 'express';
import Joi from 'joi';
import * as holidayController from '../../controllers/rest/holiday/holiday.controller.js';
import { authenticateUser } from '../../middleware/auth.js';
// ✅ PHASE 3 SECURITY FIX: Input validation
import {
  validateBody,
  validateQuery,
  validateParams,
  createHolidaySchema,
  updateHolidaySchema,
  holidayQuerySchema,
  validateHolidaySchema,
  calculateWorkingDaysSchema,
  objectIdSchema
} from '../../middleware/validation/index.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateUser);

/**
 * @route   GET /api/holidays
 * @desc    Get all holidays for a company with optional filtering
 * @query   year - Filter by year
 * @query   month - Filter by month (1-12)
 * @query   type - Filter by type (public, company, optional)
 * @query   search - Search by name or description
 * @access  Private
 */
router.get('/', validateQuery(holidayQuerySchema), holidayController.getHolidays);

/**
 * @route   GET /api/holidays/upcoming
 * @desc    Get upcoming holidays
 * @query   days - Number of days ahead to look (default: 30)
 * @access  Private
 */
router.get('/upcoming', holidayController.getUpcomingHolidaysHandler);

/**
 * @route   GET /api/holidays/stats
 * @desc    Get holiday statistics
 * @query   year - Year for stats (default: current year)
 * @access  Private (Admin, HR)
 */
router.get('/stats', holidayController.getHolidayStats);

/**
 * @route   POST /api/holidays/calculate
 * @desc    Calculate working days for a date range
 * @body    startDate - Start date
 * @body    endDate - End date
 * @body    state - Optional state for region-specific holidays
 * @access  Private
 */
router.post('/calculate', validateBody(calculateWorkingDaysSchema), holidayController.calculateDaysHandler);

/**
 * @route   GET /api/holidays/check
 * @desc    Check if a specific date is a working day
 * @query   date - Date to check
 * @query   state - Optional state for region-specific holidays
 * @access  Private
 */
router.get('/check', holidayController.checkWorkingDayHandler);

/**
 * @route   POST /api/holidays/validate
 * @desc    Validate leave request dates
 * @body    startDate - Start date
 * @body    endDate - End date
 * @body    employeeId - Employee ID
 * @access  Private
 */
router.post('/validate', validateBody(validateHolidaySchema), holidayController.validateLeaveDatesHandler);

/**
 * @route   GET /api/holidays/:id
 * @desc    Get holiday by ID
 * @access  Private
 */
router.get('/:id', validateParams(Joi.object({ id: objectIdSchema.required() })), holidayController.getHolidayById);

/**
 * @route   POST /api/holidays
 * @desc    Create new holiday
 * @access  Private (Admin, HR)
 */
router.post('/', validateBody(createHolidaySchema), holidayController.createHoliday);

/**
 * @route   PUT /api/holidays/:id
 * @desc    Update holiday
 * @access  Private (Admin, HR)
 */
router.put('/:id', validateBody(updateHolidaySchema), validateParams(Joi.object({ id: objectIdSchema.required() })), holidayController.updateHoliday);

/**
 * @route   DELETE /api/holidays/:id
 * @desc    Delete holiday (soft delete)
 * @access  Private (Admin, HR)
 */
router.delete('/:id', validateParams(Joi.object({ id: objectIdSchema.required() })), holidayController.deleteHoliday);

export default router;
