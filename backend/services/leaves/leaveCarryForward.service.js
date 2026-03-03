/**
 * Leave Carry Forward Service
 * Handles automatic carry forward of unused leave balance at year end
 */

import { getTenantCollections } from '../../config/db.js';

/**
 * Carry forward configuration for each leave type
 * Defines max days that can be carried forward and validity period
 */
const CARRY_FORWARD_CONFIG = {
  casual: {
    enabled: true,
    maxDays: 3, // Maximum 3 days can be carried forward
    validityMonths: 3, // Valid for 3 months in new year
    requireMinBalance: 2, // Minimum 2 days balance to be eligible
  },
  sick: {
    enabled: true,
    maxDays: 5, // Maximum 5 days can be carried forward
    validityMonths: 6, // Valid for 6 months in new year
    requireMinBalance: 3,
  },
  earned: {
    enabled: true,
    maxDays: 15, // Maximum 15 days can be carried forward
    validityMonths: 12, // Valid for entire year
    requireMinBalance: 5,
  },
  compensatory: {
    enabled: true,
    maxDays: 2,
    validityMonths: 2,
    requireMinBalance: 1,
  },
  // Other leave types cannot be carried forward
  maternity: { enabled: false },
  paternity: { enabled: false },
  bereavement: { enabled: false },
  unpaid: { enabled: false },
  special: { enabled: false },
};

/**
 * Get carry forward configuration for a company
 */
export const getCarryForwardConfig = async (companyId) => {
  try {
    // In a real implementation, this would fetch from company settings
    // For now, return default config
    return {
      success: true,
      data: CARRY_FORWARD_CONFIG,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Update carry forward configuration for a company
 */
export const updateCarryForwardConfig = async (companyId, config) => {
  try {
    // In a real implementation, this would save to company settings
    return {
      success: true,
      data: config,
      message: 'Carry forward configuration updated successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Calculate carry forward for an employee
 */
export const calculateEmployeeCarryForward = async (companyId, employeeId, fromYear) => {
  try {
    const toYear = fromYear + 1;
    const { employees } = getTenantCollections(companyId);

    const employee = await employees.findOne({
      employeeId,
      isDeleted: { $ne: true },
    });

    if (!employee || !employee.leaveBalance?.balances) {
      return {
        success: false,
        error: 'Employee not found or has no leave balances',
      };
    }

    const carryForwardEntries = [];

    for (const balance of employee.leaveBalance.balances) {
      const config = CARRY_FORWARD_CONFIG[balance.type];

      if (!config || !config.enabled) {
        continue;
      }

      // Check if employee meets minimum balance requirement
      if (balance.balance < config.requireMinBalance) {
        continue;
      }

      // Calculate carry forward amount (cap at max days)
      const carryForwardAmount = Math.min(balance.balance, config.maxDays);

      if (carryForwardAmount <= 0) {
        continue;
      }

      // Calculate expiry date
      const expiryDate = new Date(toYear, 0, 1); // January 1st of new year
      expiryDate.setMonth(expiryDate.getMonth() + config.validityMonths);

      carryForwardEntries.push({
        leaveType: balance.type,
        fromBalance: balance.balance,
        carryForwardAmount,
        maxAllowed: config.maxDays,
        validityMonths: config.validityMonths,
        expiryDate,
        financialYear: `FY${fromYear}-${toYear}`,
      });
    }

    return {
      success: true,
      data: carryForwardEntries,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Execute carry forward for an employee
 */
export const executeEmployeeCarryForward = async (companyId, employeeId, fromYear, executedBy) => {
  try {
    const toYear = fromYear + 1;
    const { employees, leaveLedger } = getTenantCollections(companyId);

    const employee = await employees.findOne({
      employeeId,
      isDeleted: { $ne: true },
    });

    if (!employee || !employee.leaveBalance?.balances) {
      return {
        success: false,
        error: 'Employee not found or has no leave balances',
      };
    }

    const results = [];
    const updatedBalances = [...employee.leaveBalance.balances];

    for (const balanceItem of updatedBalances) {
      const config = CARRY_FORWARD_CONFIG[balanceItem.type];

      if (!config || !config.enabled) {
        continue;
      }

      // Check if employee meets minimum balance requirement
      if (balanceItem.balance < config.requireMinBalance) {
        continue;
      }

      // Calculate carry forward amount
      const carryForwardAmount = Math.min(balanceItem.balance, config.maxDays);

      if (carryForwardAmount <= 0) {
        continue;
      }

      // Create ledger entry for carry forward (native MongoDB insert)
      const ledgerEntry = {
        companyId,
        employeeId,
        leaveType: balanceItem.type,
        transactionType: 'carry_forward',
        amount: carryForwardAmount,
        financialYear: `FY${fromYear}-${toYear}`,
        fromYear,
        toYear,
        changedBy: executedBy,
        transactionDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      };
      const insertResult = await leaveLedger.insertOne(ledgerEntry);

      // Update balance in memory
      const balanceIndex = updatedBalances.findIndex(b => b.type === balanceItem.type);
      if (balanceIndex !== -1) {
        // Add to new year's balance (reset total to new year's allocation + carry forward)
        const newAllocation = getNewAllocationForType(balanceItem.type);
        updatedBalances[balanceIndex] = {
          ...updatedBalances[balanceIndex],
          total: newAllocation + carryForwardAmount,
          used: 0,
          balance: newAllocation + carryForwardAmount,
        };
      }

      results.push({
        leaveType: balanceItem.type,
        amount: carryForwardAmount,
        ledgerEntryId: insertResult.insertedId,
      });
    }

    // Persist updated balances with native driver
    await employees.updateOne(
      { employeeId },
      { $set: { 'leaveBalance.balances': updatedBalances, updatedAt: new Date() } }
    );

    return {
      success: true,
      data: results,
      message: `Carry forward completed for ${results.length} leave types`,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get new allocation amount for a leave type
 * This would typically come from company policy or employee grade
 */
const getNewAllocationForType = (leaveType) => {
  const defaultAllocations = {
    casual: 10,
    sick: 10,
    earned: 15,
    compensatory: 2,
    maternity: 90,
    paternity: 15,
    bereavement: 3,
    unpaid: 0,
    special: 5,
  };

  return defaultAllocations[leaveType] || 0;
};

/**
 * Execute carry forward for all employees in a company
 */
export const executeCompanyCarryForward = async (companyId, fromYear, executedBy) => {
  try {
    const { employees } = getTenantCollections(companyId);

    const allEmployees = await employees.find({
      companyId,
      isActive: true,
      isDeleted: { $ne: true },
      employmentStatus: 'Active',
    }).toArray();

    const results = [];

    for (const employee of allEmployees) {
      const result = await executeEmployeeCarryForward(
        companyId,
        employee.employeeId,
        fromYear,
        executedBy
      );

      results.push({
        employeeId: employee.employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        result,
      });
    }

    return {
      success: true,
      data: {
        totalEmployees: allEmployees.length,
        processed: results.length,
        results,
      },
      message: `Carry forward processed for ${results.length} employees`,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get carry forward history for an employee
 */
export const getCarryForwardHistory = async (companyId, employeeId) => {
  try {
    const { leaveLedger } = getTenantCollections(companyId);

    const entries = await leaveLedger.find({
      companyId,
      employeeId,
      transactionType: 'carry_forward',
      isDeleted: { $ne: true },
    })
      .sort({ transactionDate: -1 })
      .toArray();

    return {
      success: true,
      data: entries,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get carry forward summary for a financial year
 */
export const getCarryForwardSummary = async (companyId, financialYear) => {
  try {
    const { leaveLedger } = getTenantCollections(companyId);

    const summary = await leaveLedger.aggregate([
      {
        $match: {
          companyId,
          transactionType: 'carry_forward',
          financialYear,
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: '$leaveType',
          totalEmployees: { $sum: 1 },
          totalDays: { $sum: '$amount' },
          avgDays: { $avg: '$amount' },
        },
      },
    ]).toArray();

    return {
      success: true,
      data: summary,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

export default {
  getCarryForwardConfig,
  updateCarryForwardConfig,
  calculateEmployeeCarryForward,
  executeEmployeeCarryForward,
  executeCompanyCarryForward,
  getCarryForwardHistory,
  getCarryForwardSummary,
};
