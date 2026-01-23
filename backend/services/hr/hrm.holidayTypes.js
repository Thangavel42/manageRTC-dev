import { ObjectId } from "mongodb";
import { getTenantCollections } from "../../config/db.js";

const normalizeStatus = (status) => {
  if (!status) return "Active";
  const normalized = status.toLowerCase();
  return normalized === "inactive" ? "Inactive" : "Active";
};

/**
 * Get all holiday types for a company
 */
export const getHolidayTypes = async (companyId) => {
  try {
    if (!companyId) {
      return { done: false, message: "Missing companyId" };
    }

    const collections = getTenantCollections(companyId);

    const holidayTypes = await collections.holidayTypes
      .find({})
      .sort({ createdAt: 1 })
      .toArray();

    return {
      done: true,
      data: holidayTypes,
      message: holidayTypes.length
        ? "Holiday types fetched successfully"
        : "No holiday types found",
    };
  } catch (error) {
    return {
      done: false,
      message: `Failed to fetch holiday types: ${error.message}`,
    };
  }
};

/**
 * Add a new holiday type
 */
export const addHolidayType = async (companyId, hrId, holidayTypeData) => {
  try {
    if (!companyId || !holidayTypeData) {
      return {
        done: false,
        message: "All fields are required",
      };
    }

    const collections = getTenantCollections(companyId);

    // Validate required fields
    if (!holidayTypeData.name) {
      return {
        done: false,
        errors: {
          name: "Holiday type name is required",
        },
        message: "Holiday type name is required",
      };
    }

    // Normalize name (trim and handle case)
    const normalizedName = holidayTypeData.name.trim();

    if (normalizedName.length === 0) {
      return {
        done: false,
        errors: {
          name: "Holiday type name cannot be empty",
        },
        message: "Holiday type name cannot be empty",
      };
    }

    // Check for duplicate holiday type (case-insensitive)
    const existingType = await collections.holidayTypes.findOne({
      name: { $regex: new RegExp(`^${normalizedName}$`, "i") },
    });

    if (existingType) {
      return {
        done: false,
        errors: {
          name: "This holiday type already exists",
        },
        message: "This holiday type already exists",
      };
    }

    // Prepare holiday type document
    const holidayTypeDocument = {
      name: normalizedName,
      // status field removed - not needed for holiday types
      createdBy: hrId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collections.holidayTypes.insertOne(holidayTypeDocument);

    return {
      done: true,
      data: {
        _id: result.insertedId,
        ...holidayTypeDocument,
      },
      message: "Holiday type created successfully",
    };
  } catch (error) {
    return {
      done: false,
      message: `Failed to create holiday type: ${error.message}`,
    };
  }
};

/**
 * Update an existing holiday type
 */
export const updateHolidayType = async (companyId, hrId, payload) => {
  try {
    if (!companyId || !payload) {
      return { done: false, message: "Missing required parameters" };
    }

    const collections = getTenantCollections(companyId);

    const typeId = payload.typeId || payload._id;
    
    if (!typeId) {
      return { done: false, message: "Holiday type ID not found" };
    }

    // Validate required fields
    if (!payload.name) {
      return {
        done: false,
        errors: {
          name: "Holiday type name is required",
        },
        message: "Holiday type name is required",
      };
    }

    // Normalize name
    const normalizedName = payload.name.trim();

    if (normalizedName.length === 0) {
      return {
        done: false,
        errors: {
          name: "Holiday type name cannot be empty",
        },
        message: "Holiday type name cannot be empty",
      };
    }

    // Check for duplicate holiday type (excluding current type)
    const existingType = await collections.holidayTypes.findOne({
      name: { $regex: new RegExp(`^${normalizedName}$`, "i") },
      _id: { $ne: new ObjectId(typeId) },
    });

    if (existingType) {
      return {
        done: false,
        errors: {
          name: "This holiday type already exists",
        },
        message: "This holiday type already exists",
      };
    }

    // Prepare update document
    const updateDoc = {
      name: normalizedName,
      // status field removed - not needed for holiday types
      updatedBy: hrId,
      updatedAt: new Date(),
    };

    const result = await collections.holidayTypes.updateOne(
      { _id: new ObjectId(typeId) },
      { $set: updateDoc }
    );

    if (result.matchedCount === 0) {
      return { done: false, message: "Holiday type not found" };
    }

    return {
      done: true,
      data: { _id: typeId, ...updateDoc },
      message: "Holiday type updated successfully",
    };
  } catch (error) {
    return {
      done: false,
      error: `Failed to update holiday type: ${error.message}`,
    };
  }
};

/**
 * Delete a holiday type (hard delete - permanently removes from database)
 */
export const deleteHolidayType = async (companyId, typeId) => {
  try {
    if (!companyId || !typeId) {
      return { done: false, message: "Missing required parameters" };
    }

    const collections = getTenantCollections(companyId);

    // Check if any holidays are using this type
    const holidaysWithType = await collections.holidays.countDocuments({
      holidayTypeId: new ObjectId(typeId),
    });

    if (holidaysWithType > 0) {
      return {
        done: false,
        message: `Cannot delete this holiday type. It is currently used by ${holidaysWithType} holiday(s). Please reassign or delete those holidays first.`,
      };
    }

    // Hard delete - permanently remove from database
    const result = await collections.holidayTypes.deleteOne({
      _id: new ObjectId(typeId),
    });

    if (result.deletedCount === 0) {
      return { done: false, message: "Holiday type not found" };
    }

    return {
      done: true,
      data: { typeId },
      message: "Holiday type deleted successfully",
    };
  } catch (error) {
    return {
      done: false,
      error: `Failed to delete holiday type: ${error.message}`,
    };
  }
};

/**
 * Initialize default holiday types for a new company
 */
export const initializeDefaultHolidayTypes = async (companyId, hrId) => {
  try {
    if (!companyId) {
      return { done: false, message: "Missing companyId" };
    }

    const collections = getTenantCollections(companyId);

    // Check if types already exist (double-check to prevent race conditions)
    const existingCount = await collections.holidayTypes.countDocuments({});

    if (existingCount > 0) {
      console.log(`[Holiday Types Service] Types already exist for company ${companyId}: ${existingCount} types`);
      return {
        done: true, // Return success since types exist
        data: [],
        message: `Holiday types already exist for this company (${existingCount} types found)`,
      };
    }

    console.log(`[Holiday Types Service] Initializing default types for company ${companyId}`);

    // Default holiday types
    const defaultTypes = [
      "Public (National) Holidays",
      "State / Regional Holidays",
      "Local Holidays",
      "Religious Holidays",
      "Government Holidays",
      "Company / Organization Holidays",
      "Special / Emergency Holidays",
      "Others"
    ];

    const now = new Date();
    const defaultTypeDocuments = defaultTypes.map((name) => ({
      name,
      // status field removed - not needed for holiday types
      createdBy: hrId || "system",
      createdAt: now,
      updatedAt: now,
    }));

    // Use insertMany with ordered: false to insert as many as possible
    // even if some fail due to duplicates
    try {
      const result = await collections.holidayTypes.insertMany(defaultTypeDocuments, {
        ordered: false
      });

      console.log(`[Holiday Types Service] Successfully inserted ${Object.keys(result.insertedIds).length} default types`);

      return {
        done: true,
        data: result.insertedIds,
        message: "Default holiday types initialized successfully",
      };
    } catch (insertError) {
      // If we get duplicate key errors, check if all types were created by another request
      const finalCount = await collections.holidayTypes.countDocuments({});

      if (finalCount >= defaultTypes.length) {
        console.log(`[Holiday Types Service] Types were created by concurrent request. Final count: ${finalCount}`);
        return {
          done: true,
          data: [],
          message: "Default holiday types already initialized by concurrent request",
        };
      }

      throw insertError;
    }
  } catch (error) {
    console.error(`[Holiday Types Service] Error initializing defaults:`, error);
    return {
      done: false,
      message: `Failed to initialize default holiday types: ${error.message}`,
    };
  }
};
