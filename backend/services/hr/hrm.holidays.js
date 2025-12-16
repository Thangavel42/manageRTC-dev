import { ObjectId } from "mongodb";
import { getTenantCollections } from "../../config/db.js";

export const addHoliday = async (companyId, hrId, holidaydata) => {
  try {
    if (!companyId || !holidaydata) {
      return {
        done: false,
        message: "All fields are required",
      };
    }

    const collections = getTenantCollections(companyId);

    if (
      !holidaydata.title ||
      !holidaydata.date ||
      !holidaydata.description ||
      !holidaydata.status
    ) {
      return {
        done: false,
        message: "Holiday title, date, description and status are required",
      };
    }

    if (new Date(holidaydata.date) < new Date()) {
      return { done: false, message: "Date must be in the future" };
    }

    const existingHoliday = await collections.holidays.findOne({
      date: new Date(holidaydata.date),
    });

    if (existingHoliday) {
      console.log("swetyy");

      return {
        done: false,
        message: "A holiday already exists on this date",
      };
    }

    const result = await collections.holidays.insertOne({
      title: holidaydata.title,
      date: new Date(holidaydata.date),
      description: holidaydata.description,
      status: holidaydata.status,
      createdBy: hrId,
      createdAt: new Date(),
    });

    return {
      done: true,
      data: {
        _id: result.insertedId,
        ...holidaydata,
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
    if (!companyId) {
      return { done: false, message: "Missing companyId" };
    }

    const collections = getTenantCollections(companyId);

    const holidays = await collections.holidays
      .find({})
      .sort({ date: -1 })
      .toArray();

    return {
      done: true,
      data: holidays,
      message: holidays.length
        ? "holidays fetched successfully"
        : "No holidays found matching criteria",
    };
  } catch (error) {
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

    if (!payload.holidayId) {
      return { done: false, message: "Holiday ID not found" };
    }

    if (!payload.title || !payload.date || !payload.description || !payload.status) {
      return {
        done: false,
        message: "Title, date, description and status are required",
      };
    }

    const existingHoliday = await collections.holidays.findOne({
      date: new Date(payload.date),
      _id: { $ne: new ObjectId(payload.holidayId) },
    });

    if (existingHoliday) {
      return {
        done: false,
        message: "A holiday already exists on this date.",
      };
    }

    const result = await collections.holidays.updateOne(
      { _id: new ObjectId(payload.holidayId) },
      {
        $set: {
          title: payload.title,
          date: new Date(payload.date),
          description: payload.description,
          status: payload.status,
          updatedBy: hrId,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return { done: false, message: "Holiday not found" };
    }

    return {
      done: true,
      data: { holidayId: payload.holidayId, ...payload },
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

    return {
      done: true,
      data: { holidayId },
      message: "Holiday deleted successfully",
    };
  } catch (error) {
    return {
      done: false,
      error: `Failed to delete holiday: ${error.message}`,
    };
  }
};
