/**
 * Leave Days Calculator
 * Calculates working days between dates excluding weekends and holidays
 * MULTI-TENANT: Uses company-specific MongoDB collections via getTenantCollections()
 */

import { getTenantCollections } from '../config/db.js';

/**
 * Default weekend configuration (Sunday = 0, Saturday = 6)
 */
const DEFAULT_WEEKEND_DAYS = [0, 6];

/**
 * Default timezone (can be overridden by company settings)
 */
const DEFAULT_TIMEZONE = 'UTC';

/**
 * Get company weekend configuration
 * In the future, this can be fetched from company settings
 */
const getWeekendDays = async (companyId) => {
  // TODO: Fetch from company settings
  // For now, return default (Sunday, Saturday)
  return DEFAULT_WEEKEND_DAYS;
};

/**
 * Get company timezone
 * Phase 2.6: Added timezone support for date calculations
 */
const getCompanyTimezone = async (companyId) => {
  // TODO: Fetch from company settings
  // For now, return default UTC
  return DEFAULT_TIMEZONE;
};

/**
 * Normalize date to midnight for consistent comparison
 * Phase 2.6: Added timezone support
 */
const normalizeDate = (date, timezone = DEFAULT_TIMEZONE) => {
  const d = new Date(date);
  // Use the timezone to normalize to midnight in that timezone
  const options = { timeZone: timezone, year: 'numeric', month: 'numeric', day: 'numeric' };
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(d);
  const year = parseInt(parts.find(p => p.type === 'year').value);
  const month = parseInt(parts.find(p => p.type === 'month').value) - 1;
  const day = parseInt(parts.find(p => p.type === 'day').value);

  const normalized = new Date(year, month, day, 0, 0, 0, 0);
  return normalized;
};

/**
 * Check if a date is a weekend
 */
const isWeekend = (date, weekendDays) => {
  const dayOfWeek = date.getDay();
  return weekendDays.includes(dayOfWeek);
};

/**
 * Check if a date is a holiday
 */
const isHoliday = (date, holidays) => {
  const dateStr = date.toISOString().split('T')[0];
  return holidays.some(h => {
    const holidayDateStr = new Date(h.date).toISOString().split('T')[0];
    return holidayDateStr === dateStr;
  });
};

/**
 * Get holidays in date range for a company (using tenant collections)
 */
const getHolidaysInRange = async (companyId, startDate, endDate) => {
  const collections = getTenantCollections(companyId);
  return await collections.holidays.find({
    date: { $gte: startDate, $lte: endDate },
    isActive: true
  }).toArray();
};

/**
 * Check if a specific date is a holiday (using tenant collections)
 */
const isHolidayDate = async (companyId, date, state = null) => {
  const collections = getTenantCollections(companyId);
  const query = {
    date: {
      $gte: new Date(date).setHours(0, 0, 0, 0),
      $lte: new Date(date).setHours(23, 59, 59, 999)
    },
    isActive: true
  };

  // If state is provided, check for state-specific holidays or public holidays
  if (state) {
    query.$or = [
      { type: 'public' },
      { applicableStates: { $in: [state, null] } },
      { applicableStates: { $exists: false } }
    ];
  }

  const holiday = await collections.holidays.findOne(query);
  return holiday ? { isHoliday: true, name: holiday.name, type: holiday.type } : { isHoliday: false };
};

/**
 * Get upcoming holidays (using tenant collections)
 */
const getUpcomingHolidays = async (companyId, days = 30) => {
  const collections = getTenantCollections(companyId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + days);

  return await collections.holidays.find({
    date: { $gte: today, $lte: futureDate },
    isActive: true
  }).sort({ date: 1 }).toArray();
};

/**
 * Calculate working days between two dates excluding weekends and holidays
 *
 * @param {string} companyId - Company ID
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @param {string} state - Optional state for region-specific holidays
 * @param {string} durationType - Optional: 'full-day' (default) or 'half-day'
 * @param {string} halfDayType - Optional for half-day: 'first-half' or 'second-half'
 * @returns {Promise<Object>} Working days calculation result
 */
export const calculateWorkingDays = async (companyId, startDate, endDate, state = null, durationType = 'full-day', halfDayType = null) => {
  // Phase 2.6: Get company timezone for date normalization
  const timezone = await getCompanyTimezone(companyId);

  const start = normalizeDate(new Date(startDate), timezone);
  const end = normalizeDate(new Date(endDate), timezone);

  // Validate date range
  if (start > end) {
    throw new Error('Start date cannot be after end date');
  }

  // Get weekend configuration for company
  const weekendDays = await getWeekendDays(companyId);

  // Get holidays in the date range
  const holidays = await getHolidaysInRange(companyId, start, end);

  // Filter holidays based on state if provided
  const applicableHolidays = state
    ? holidays.filter(h =>
      h.type === 'public' ||
      !h.applicableStates ||
      h.applicableStates.length === 0 ||
      h.applicableStates.includes(state)
    )
    : holidays;

  const holidayDates = new Set(
    applicableHolidays.map(h => normalizeDate(new Date(h.date), timezone).getTime())
  );

  // Calculate working days
  let workingDays = 0;
  let weekendDayCount = 0;
  let holidayCount = 0;
  const dates = [];

  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const dateTimestamp = date.getTime();
    const dayIsWeekend = isWeekend(date, weekendDays);
    const dayIsHoliday = holidayDates.has(dateTimestamp);

    if (dayIsWeekend) {
      weekendDayCount++;
    } else if (dayIsHoliday) {
      holidayCount++;
    } else {
      workingDays++;
    }

    // Find holiday name if applicable
    let holidayName = null;
    if (dayIsHoliday) {
      const holiday = applicableHolidays.find(h =>
        normalizeDate(new Date(h.date), timezone).getTime() === dateTimestamp
      );
      holidayName = holiday ? holiday.name : 'Holiday';
    }

    dates.push({
      date: new Date(date),
      isWeekend: dayIsWeekend,
      isHoliday: dayIsHoliday,
      isWorkingDay: !dayIsWeekend && !dayIsHoliday,
      holidayName
    });
  }

  const totalDays = dates.length;

  // Phase 2.2: Add half-day support
  let finalWorkingDays = workingDays;
  let durationInfo = {
    type: durationType,
    halfDayType: halfDayType,
    description: 'Full day leave'
  };

  if (durationType === 'half-day' && totalDays === 1) {
    // Single day half-day leave
    finalWorkingDays = 0.5;
    durationInfo = {
      type: 'half-day',
      halfDayType: halfDayType || 'first-half',
      description: halfDayType === 'second-half' ? 'Second half day leave' : 'First half day leave'
    };
  } else if (durationType === 'half-day' && totalDays > 1) {
    // Multi-day leave with half-day on first or last day
    finalWorkingDays = workingDays - 0.5; // Subtract half day
    durationInfo = {
      type: 'half-day-multi',
      halfDayType: halfDayType || 'first-half',
      description: `Multi-day leave with ${halfDayType === 'second-half' ? 'last' : 'first'} half day excluded`
    };
  }

  return {
    startDate: start,
    endDate: end,
    totalDays,
    workingDays: finalWorkingDays,
    weekendDays: weekendDayCount,
    holidayCount,
    dates,
    durationInfo,
    // Holiday details for display
    holidays: applicableHolidays.map(h => ({
      date: new Date(h.date),
      name: h.name,
      type: h.type
    }))
  };
};

/**
 * Validate leave request dates
 * Performs comprehensive validation on leave date range
 *
 * @param {string} companyId - Company ID
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @param {string} employeeId - Employee ID
 * @returns {Promise<Object>} Validation result with working days info
 */
export const validateLeaveDates = async (companyId, startDate, endDate, employeeId) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if dates are valid
  if (start > end) {
    throw new Error('Start date cannot be after end date');
  }

  // Check if start date is in the past (unless allowed by policy)
  if (start < today) {
    throw new Error('Cannot request leave for past dates');
  }

  // Calculate working days
  const workingDaysInfo = await calculateWorkingDays(companyId, startDate, endDate);

  if (workingDaysInfo.workingDays === 0) {
    throw new Error('No working days in the selected date range');
  }

  return workingDaysInfo;
};

/**
 * Calculate leave duration in days
 * Returns the actual working days between start and end dates
 *
 * @param {string} companyId - Company ID
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {Promise<number>} Number of working days
 */
export const calculateLeaveDuration = async (companyId, startDate, endDate) => {
  const result = await calculateWorkingDays(companyId, startDate, endDate);
  return result.workingDays;
};

/**
 * Check if a specific date is a working day
 *
 * @param {string} companyId - Company ID
 * @param {Date|string} date - Date to check
 * @returns {Promise<Object>} { isWorkingDay, isWeekend, isHoliday, holidayName }
 */
export const checkWorkingDay = async (companyId, date) => {
  const checkDate = normalizeDate(new Date(date));

  const weekendDays = await getWeekendDays(companyId);
  const dayIsWeekend = isWeekend(checkDate, weekendDays);

  // Check if it's a holiday
  const holiday = await isHolidayDate(companyId, checkDate);
  const dayIsHoliday = holiday.isHoliday;

  return {
    date: checkDate,
    isWorkingDay: !dayIsWeekend && !dayIsHoliday,
    isWeekend: dayIsWeekend,
    isHoliday: dayIsHoliday,
    holidayName: dayIsHoliday ? holiday.name : null
  };
};

/**
 * Get holidays for a specific month
 *
 * @param {string} companyId - Company ID
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {Promise<Array>} List of holidays for the month
 */
export const getMonthHolidays = async (companyId, year, month) => {
  const collections = getTenantCollections(companyId);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  return await collections.holidays.find({
    date: { $gte: startDate, $lte: endDate },
    isActive: true
  }).sort({ date: 1 }).toArray();
};

/**
 * Get holidays for a specific year
 *
 * @param {string} companyId - Company ID
 * @param {number} year - Year
 * @returns {Promise<Array>} List of holidays for the year
 */
export const getYearHolidays = async (companyId, year) => {
  const collections = getTenantCollections(companyId);
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  return await collections.holidays.find({
    date: { $gte: startDate, $lte: endDate },
    isActive: true
  }).sort({ date: 1 }).toArray();
};

export default {
  calculateWorkingDays,
  validateLeaveDates,
  calculateLeaveDuration,
  checkWorkingDay,
  getUpcomingHolidays,
  getMonthHolidays,
  getYearHolidays
};
