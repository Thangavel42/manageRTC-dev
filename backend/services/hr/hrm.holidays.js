import { ObjectId } from "mongodb";
import { getTenantCollections } from "../../config/db.js";
import cacheManager from "../../utils/cacheManager.js";
import logger from "../../utils/logger.js";

const normalizeStatus = (status) => {
  if (!status) return "Active";
  const normalized = status.toLowerCase();
  return normalized === "inactive" ? "Inactive" : "Active";
};

const DATE_FORMAT_REGEX = /^\d{2}-\d{2}-\d{4}$/;

const parseHolidayDate = (value) => {
  if (typeof value !== "string" || !DATE_FORMAT_REGEX.test(value)) {
    return null;
  }

  const [day, month, year] = value.split("-").map(Number);
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

export const addHoliday = async (companyId, hrId, holidaydata) => {
  try {
    if (!companyId || !holidaydata) {
      return {
        done: false,
        message: "All fields are required",
      };
    }

    const collections = getTenantCollections(companyId);

    const parsedDate = holidaydata.date ? parseHolidayDate(holidaydata.date) : null;

    // Validate required fields (description is optional)
    if (
      !holidaydata.title ||
      !holidaydata.date ||
      !holidaydata.status ||
      !holidaydata.holidayTypeId
    ) {
      return {
        done: false,
        errors: {
          title: !holidaydata.title ? "Title is required" : undefined,
          date: !holidaydata.date ? "Date is required" : undefined,
          status: !holidaydata.status ? "Status is required" : undefined,
          holidayTypeId: !holidaydata.holidayTypeId ? "Holiday type is required" : undefined,
        },
        message: "Holiday title, date, status, and type are required",
      };
    }

    if (!parsedDate) {
      return {
        done: false,
        errors: {
          date: "Date must be in DD-MM-YYYY format",
        },
        message: "Holiday date must be in DD-MM-YYYY format",
      };
    }

    // Validate that the holiday type exists
    const holidayType = await collections.holidayTypes.findOne({
      _id: new ObjectId(holidaydata.holidayTypeId),
      isDeleted: { $ne: true },
    });

    if (!holidayType) {
      return {
        done: false,
        errors: {
          holidayTypeId: "Selected holiday type does not exist",
        },
        message: "Selected holiday type does not exist",
      };
    }

    // Check for duplicate holiday on the same date
    const existingHoliday = await collections.holidays.findOne({
      date: parsedDate,
    });

    if (existingHoliday) {
      return {
        done: false,
        errors: {
          date: "A holiday already exists on this date",
        },
        message: "A holiday already exists on this date",
      };
    }

    // Prepare holiday document
    const holidayDocument = {
      title: holidaydata.title,
      date: parsedDate,
      description: holidaydata.description || "", // Optional field
      status: normalizeStatus(holidaydata.status),
      holidayTypeId: new ObjectId(holidaydata.holidayTypeId),
      // holidayTypeName removed - will be resolved via lookup in GET
      repeatsEveryYear: holidaydata.repeatsEveryYear || false, // Default to false
      createdBy: hrId,
      createdAt: new Date(),
    };

    const result = await collections.holidays.insertOne(holidayDocument);

    // Invalidate holiday cache for this company
    cacheManager.invalidateCompanyCache(companyId, 'holidays');
    logger.info('[addHoliday] Cache invalidated', { companyId });

    return {
      done: true,
      data: {
        _id: result.insertedId,
        ...holidayDocument,
      },
      message: "Holiday created successfully",
    };
  } catch (error) {
    return {
      done: false,
      message: `Failed to create holiday: ${error.message}`,
    };
  }
};

export const displayHoliday = async (companyId) => {
  try {
    logger.debug('[displayHoliday] Starting', { companyId });

    if (!companyId) {
      logger.warn('[displayHoliday] Missing companyId');
      return { done: false, message: "Missing companyId" };
    }

    // Try to get from cache first
    const cacheKey = `holidays:${companyId}`;
    const cachedHolidays = cacheManager.get(cacheKey);
    if (cachedHolidays) {
      logger.debug('[displayHoliday] Cache hit', { companyId });
      return {
        done: true,
        data: cachedHolidays,
        message: cachedHolidays.length
          ? "holidays fetched successfully (cached)"
          : "No holidays found matching criteria",
      };
    }

    const collections = getTenantCollections(companyId);
    logger.debug('[displayHoliday] Got tenant collections', { companyId });

    // Use aggregation pipeline to resolve holidayTypeName via lookup
    const holidays = await collections.holidays
      .aggregate([
        {
          $lookup: {
            from: "holidayTypes",
            localField: "holidayTypeId",
            foreignField: "_id",
            as: "holidayTypeData"
          }
        },
        {
          $addFields: {
            holidayTypeName: {
              $ifNull: [
                { $arrayElemAt: ["$holidayTypeData.name", 0] },
                "Unknown" // Fallback for missing/deleted types
              ]
            }
          }
        },
        {
          $project: {
            holidayTypeData: 0 // Remove temporary join field
          }
        },
        {
          $sort: { date: -1 }
        }
      ])
      .toArray();

    logger.debug('[displayHoliday] Found holidays', { companyId, count: holidays.length });

    // Cache the results (15 minutes - MEDIUM TTL for holidays)
    cacheManager.set(cacheKey, holidays, cacheManager.TTL.MEDIUM);

    return {
      done: true,
      data: holidays,
      message: holidays.length
        ? "holidays fetched successfully"
        : "No holidays found matching criteria",
    };
  } catch (error) {
    logger.error('[displayHoliday] Error', { error: error.message, stack: error.stack });
    return {
      done: false,
      message: `Failed to fetch holidays: ${error.message}`,
    };
  }
};

export const updateHoliday = async (companyId, hrId, payload) => {
  try {
    if (!companyId || !payload) {
      return { done: false, message: "Missing required parameters" };
    }

    const collections = getTenantCollections(companyId);

    // Use _id if holidayId is not provided (for backward compatibility)
    const holidayId = payload.holidayId || payload._id;

    if (!holidayId) {
      return { done: false, message: "Holiday ID not found" };
    }

    const parsedDate = payload.date ? parseHolidayDate(payload.date) : null;

    // Validate required fields (description is optional)
    if (!payload.title || !payload.date || !payload.status || !payload.holidayTypeId) {
      return {
        done: false,
        errors: {
          title: !payload.title ? "Title is required" : undefined,
          date: !payload.date ? "Date is required" : undefined,
          status: !payload.status ? "Status is required" : undefined,
          holidayTypeId: !payload.holidayTypeId ? "Holiday type is required" : undefined,
        },
        message: "Title, date, status, and holiday type are required",
      };
    }

    if (!parsedDate) {
      return {
        done: false,
        errors: {
          date: "Date must be in DD-MM-YYYY format",
        },
        message: "Holiday date must be in DD-MM-YYYY format",
      };
    }

    // Validate that the holiday type exists
    const holidayType = await collections.holidayTypes.findOne({
      _id: new ObjectId(payload.holidayTypeId),
      isDeleted: { $ne: true },
    });

    if (!holidayType) {
      return {
        done: false,
        errors: {
          holidayTypeId: "Selected holiday type does not exist",
        },
        message: "Selected holiday type does not exist",
      };
    }

    // Check for duplicate holiday on the same date (excluding current holiday)
    const existingHoliday = await collections.holidays.findOne({
      date: parsedDate,
      _id: { $ne: new ObjectId(holidayId) },
    });

    if (existingHoliday) {
      return {
        done: false,
        errors: {
          date: "A holiday already exists on this date",
        },
        message: "A holiday already exists on this date.",
      };
    }

    // Prepare update document
    const updateDoc = {
      title: payload.title,
      date: parsedDate,
      description: payload.description || "", // Optional field
      status: normalizeStatus(payload.status),
      holidayTypeId: new ObjectId(payload.holidayTypeId),
      // holidayTypeName removed - will be resolved via lookup in GET
      updatedBy: hrId,
      updatedAt: new Date(),
    };

    // Add repeatsEveryYear if provided
    if (payload.repeatsEveryYear !== undefined) {
      updateDoc.repeatsEveryYear = payload.repeatsEveryYear;
    }

    const result = await collections.holidays.updateOne(
      { _id: new ObjectId(holidayId) },
      { $set: updateDoc }
    );

    if (result.matchedCount === 0) {
      return { done: false, message: "Holiday not found" };
    }

    // Invalidate holiday cache for this company
    cacheManager.invalidateCompanyCache(companyId, 'holidays');
    logger.info('[updateHoliday] Cache invalidated', { companyId, holidayId });

    return {
      done: true,
      data: { _id: holidayId, ...payload },
      message: "Holiday updated successfully",
    };
  } catch (error) {
    return {
      done: false,
      error: `Failed to update holiday: ${error.message}`,
    };
  }
};

export const deleteHoliday = async (companyId, holidayId) => {
  try {
    if (!companyId || !holidayId) {
      return { done: false, message: "Missing required parameters" };
    }
    const collections = getTenantCollections(companyId);
    const result = await collections.holidays.deleteOne({
      _id: new ObjectId(holidayId),
    });

    if (result.deletedCount === 0) {
      return { done: false, message: "Holiday not found" };
    }

    // Invalidate holiday cache for this company
    cacheManager.invalidateCompanyCache(companyId, 'holidays');
    logger.info('[deleteHoliday] Cache invalidated', { companyId, holidayId });

    return {
      done: true,
      data: { holidayId },
      message: "Holiday deleted successfully",
    };
  } catch (error) {
    logger.error('[deleteHoliday] Error', { error: error.message });
    return {
      done: false,
      error: `Failed to delete holiday: ${error.message}`,
    };
  }
};
