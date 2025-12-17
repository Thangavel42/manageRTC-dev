// File: backend/services/employee/employee.services.js

import { getTenantCollections } from "../../config/db.js";

/**
 * Fetches all active employees for a given company.
 * @param {string} companyId - The ID of the company.
 * @returns {Promise<object>} - A promise that resolves to the list of employees.
 */
export const getAllEmployees = async (companyId) => {
  try {
    const collections = getTenantCollections(companyId);
    
    // Get employees with case-insensitive active status, excluding resigned
    const employees = await collections.employees
      .find({ 
        status: { 
          $regex: /^active$/i, // Case-insensitive match for "active"
        }
      })
      .sort({ createdAt: -1 })
      .toArray();
    
    console.log("✅ Active employees returned:", employees.length);

    return employees;
  } catch (error) {
    console.error("Error fetching all employees:", error);
    throw new Error("Could not retrieve employees.");
  }
};