import { ObjectId } from "mongodb";
import { getTenantCollections } from "../config/db.js";

/**
 * Check if an employee exists in any active lifecycle process
 * Prevents duplicate entries across Promotion, Resignation, and Termination
 *
 * @param {string} companyId - Company/tenant ID
 * @param {string|ObjectId} employeeId - Employee ID to check
 * @param {string} excludeProcess - Process to exclude from check ('promotion', 'resignation', 'termination')
 * @param {string} excludeRecordId - Specific record ID to exclude (for edit operations)
 * @returns {Promise<{isValid: boolean, conflictType?: string, message?: string}>}
 */
export const validateEmployeeLifecycle = async (
  companyId,
  employeeId,
  excludeProcess = null,
  excludeRecordId = null
) => {
  try {
    const collections = getTenantCollections(companyId);

    // Validate employeeId format
    if (!employeeId || !ObjectId.isValid(employeeId)) {
      return {
        isValid: false,
        message: "Invalid employee ID format"
      };
    }

    const employeeObjectId = new ObjectId(employeeId);

    // Check if employee exists
    const employee = await collections.employees.findOne({
      _id: employeeObjectId,
      isDeleted: { $ne: true }
    });

    if (!employee) {
      return {
        isValid: false,
        message: "Employee not found"
      };
    }

    // Check promotion (status: pending only)
    if (excludeProcess !== 'promotion') {
      const promotionQuery = {
        employeeId: employeeId.toString(),
        status: "pending",
        isDeleted: { $ne: true }
      };

      // Exclude specific record if provided
      if (excludeRecordId && excludeProcess === 'promotion') {
        promotionQuery._id = { $ne: new ObjectId(excludeRecordId) };
      }

      const existingPromotion = await collections.promotions.findOne(promotionQuery);

      if (existingPromotion) {
        return {
          isValid: false,
          conflictType: "promotion",
          message: "This employee already has a pending promotion."
        };
      }
    }

    // Check resignation (status: pending or on_notice)
    if (excludeProcess !== 'resignation') {
      const resignationQuery = {
        employeeId: employeeId.toString(),
        resignationStatus: { $in: ["pending", "on_notice", "approved"] }
      };

      // Exclude specific record if provided
      if (excludeRecordId && excludeProcess === 'resignation') {
        resignationQuery.resignationId = { $ne: excludeRecordId };
      }

      const existingResignation = await collections.resignation.findOne(resignationQuery);

      if (existingResignation) {
        return {
          isValid: false,
          conflictType: "resignation",
          message: "This employee is already in resignation process."
        };
      }
    }

    // Check termination (status: pending or processed)
    if (excludeProcess !== 'termination') {
      const terminationQuery = {
        employeeId: employeeId.toString(),
        status: { $in: ["pending", "processed"] }
      };

      // Exclude specific record if provided
      if (excludeRecordId && excludeProcess === 'termination') {
        terminationQuery.terminationId = { $ne: excludeRecordId };
      }

      const existingTermination = await collections.termination.findOne(terminationQuery);

      if (existingTermination) {
        return {
          isValid: false,
          conflictType: "termination",
          message: "This employee is already in termination process."
        };
      }
    }

    return {
      isValid: true
    };
  } catch (error) {
    console.error("[EmployeeLifecycleValidator] Error:", error);
    return {
      isValid: false,
      message: error.message || "Validation error"
    };
  }
};
