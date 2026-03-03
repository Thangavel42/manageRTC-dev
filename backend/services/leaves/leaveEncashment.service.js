/**
 * Leave Encashment Service
 * Handles conversion of unused leave to salary
 */

import { getTenantCollections } from '../../config/db.js';

/**
 * Encashment configuration for each leave type
 */
const ENCASHMENT_CONFIG = {
  earned: {
    enabled: true,
    minBalance: 5, // Minimum 5 days balance to be eligible
    maxEncashmentDays: 15, // Maximum 15 days can be encashed per year
    requireMinService: 12, // Minimum 12 months of service required
    encashmentRate: 'basic', // Rate based on basic salary
  },
  casual: {
    enabled: false, // Casual leave cannot be encashed
  },
  sick: {
    enabled: false, // Sick leave cannot be encashed
  },
  compensatory: {
    enabled: true,
    minBalance: 2,
    maxEncashmentDays: 5,
    requireMinService: 6,
    encashmentRate: 'basic',
  },
  // Other leave types cannot be encashed
  maternity: { enabled: false },
  paternity: { enabled: false },
  bereavement: { enabled: false },
  unpaid: { enabled: false },
  special: { enabled: false },
};

/**
 * Get encashment configuration
 */
export const getEncashmentConfig = async (companyId) => {
  try {
    return {
      success: true,
      data: ENCASHMENT_CONFIG,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Calculate encashment eligibility and amount for an employee
 */
export const calculateEncashment = async (companyId, employeeId, leaveType, daysRequested) => {
  try {
    const { employees, leaveLedger } = getTenantCollections(companyId);

    const employee = await employees.findOne({
      employeeId,
      isDeleted: { $ne: true },
    });

    if (!employee) {
      return {
        success: false,
        error: 'Employee not found',
      };
    }

    // Check if leave type is eligible for encashment
    const config = ENCASHMENT_CONFIG[leaveType];
    if (!config || !config.enabled) {
      return {
        success: false,
        error: `${leaveType} leave is not eligible for encashment`,
      };
    }

    // Check employee's service period
    const joiningDate = new Date(employee.joiningDate);
    const today = new Date();
    const monthsOfService = (today.getFullYear() - joiningDate.getFullYear()) * 12 +
      (today.getMonth() - joiningDate.getMonth());

    if (monthsOfService < config.requireMinService) {
      return {
        success: false,
        error: `Minimum ${config.requireMinService} months of service required for encashment`,
        eligibility: {
          isEligible: false,
          reason: `Insufficient service period. Required: ${config.requireMinService} months, Current: ${monthsOfService} months`,
        },
      };
    }

    // Get current leave balance
    const balanceItem = employee.leaveBalance?.balances?.find(b => b.type === leaveType);

    if (!balanceItem || balanceItem.balance < config.minBalance) {
      return {
        success: false,
        error: `Minimum ${config.minBalance} days balance required for encashment`,
        eligibility: {
          isEligible: false,
          reason: `Insufficient balance. Required: ${config.minBalance} days, Current: ${balanceItem?.balance || 0} days`,
        },
      };
    }

    // Calculate maximum encashable days
    const maxEncashableDays = Math.min(
      balanceItem.balance - config.minBalance,
      config.maxEncashmentDays
    );

    if (daysRequested > maxEncashableDays) {
      return {
        success: false,
        error: `Cannot encash more than ${maxEncashableDays} days`,
        eligibility: {
          isEligible: true,
          maxEncashableDays,
          currentBalance: balanceItem.balance,
          minBalanceRequired: config.minBalance,
        },
      };
    }

    // Calculate encashment amount
    // For now, using basic salary / 30 as daily rate
    const dailyRate = (employee.salary?.basic || 0) / 30;
    const encashmentAmount = dailyRate * daysRequested;

    // Get already encashed days this year
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);

    const encashedDays = await leaveLedger.aggregate([
      {
        $match: {
          companyId,
          employeeId,
          leaveType,
          transactionType: 'encashed',
          transactionDate: { $gte: yearStart, $lte: yearEnd },
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: null,
          totalDays: { $sum: { $abs: '$amount' } },
        },
      },
    ]).toArray();

    const totalEncashedThisYear = encashedDays[0]?.totalDays || 0;
    const remainingEncashmentDays = maxEncashableDays - totalEncashedThisYear;

    if (daysRequested > remainingEncashmentDays) {
      return {
        success: false,
        error: `Annual encashment limit exceeded. Remaining: ${remainingEncashmentDays} days`,
        eligibility: {
          isEligible: true,
          maxEncashableDays: remainingEncashmentDays,
          totalEncashedThisYear,
          currentBalance: balanceItem.balance,
        },
      };
    }

    return {
      success: true,
      data: {
        employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        leaveType,
        daysRequested,
        maxEncashableDays,
        remainingEncashmentDays,
        totalEncashedThisYear,
        currentBalance: balanceItem.balance,
        dailyRate,
        encashmentAmount,
        eligibility: {
          isEligible: true,
          monthsOfService,
          reason: 'Eligible for encashment',
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Execute leave encashment
 */
export const executeEncashment = async (companyId, employeeId, leaveType, daysRequested, requestedBy, remarks) => {
  try {
    // First calculate eligibility
    const calculation = await calculateEncashment(companyId, employeeId, leaveType, daysRequested);

    if (!calculation.success) {
      return calculation;
    }

    const data = calculation.data;
    const { employees, leaveLedger } = getTenantCollections(companyId);

    // Create ledger entry for encashment
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Get current balance from ledger
    const latestEntry = await leaveLedger.findOne(
      {
        companyId,
        employeeId,
        leaveType,
        isDeleted: { $ne: true },
      },
      { sort: { transactionDate: -1 } }
    );

    const balanceBefore = latestEntry ? latestEntry.balanceAfter : data.currentBalance;
    const balanceAfter = balanceBefore - daysRequested;

    const ledgerDoc = {
      employeeId,
      companyId,
      leaveType,
      transactionType: 'encashed',
      amount: -daysRequested,
      balanceBefore,
      balanceAfter,
      transactionDate: now,
      financialYear: `FY${year}-${year + 1}`,
      year,
      month,
      description: `Leave encashment: ${daysRequested} days`,
      adjustmentReason: remarks || 'Leave encashed as per employee request',
      changedBy: requestedBy,
      changedByUserId: requestedBy,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };
    const insertResult = await leaveLedger.insertOne(ledgerDoc);

    // Update employee balance with native driver
    const employee = await employees.findOne({ employeeId, isDeleted: { $ne: true } });

    if (employee && employee.leaveBalance?.balances) {
      const updatedBalances = employee.leaveBalance.balances.map(b => {
        if (b.type === leaveType) {
          return {
            ...b,
            balance: balanceAfter,
            used: (b.used || 0) + daysRequested,
          };
        }
        return b;
      });

      await employees.updateOne(
        { employeeId },
        { $set: { 'leaveBalance.balances': updatedBalances, updatedAt: now } }
      );
    }

    return {
      success: true,
      data: {
        ledgerEntryId: insertResult.insertedId,
        encashmentDetails: data,
        message: `${daysRequested} days of ${leaveType} leave encashed successfully. Amount: ${data.encashmentAmount.toFixed(2)}`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get encashment history for an employee
 */
export const getEncashmentHistory = async (companyId, employeeId, year) => {
  try {
    const { leaveLedger } = getTenantCollections(companyId);

    const matchQuery = {
      companyId,
      employeeId,
      transactionType: 'encashed',
      isDeleted: { $ne: true },
    };

    if (year) {
      const yearStart = new Date(parseInt(year), 0, 1);
      const yearEnd = new Date(parseInt(year), 11, 31);
      matchQuery.transactionDate = { $gte: yearStart, $lte: yearEnd };
    }

    const entries = await leaveLedger.find(matchQuery)
      .sort({ transactionDate: -1 })
      .toArray();

    // Calculate totals
    const totals = await leaveLedger.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$leaveType',
          totalDays: { $sum: { $abs: '$amount' } },
          totalAmount: { $sum: '$balanceBefore' },
          count: { $sum: 1 },
        },
      },
    ]).toArray();

    return {
      success: true,
      data: {
        entries,
        totals,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get encashment summary for all employees (admin view)
 */
export const getEncashmentSummary = async (companyId, year) => {
  try {
    const { leaveLedger } = getTenantCollections(companyId);

    const matchQuery = {
      companyId,
      transactionType: 'encashed',
      isDeleted: { $ne: true },
    };

    if (year) {
      const yearStart = new Date(parseInt(year), 0, 1);
      const yearEnd = new Date(parseInt(year), 11, 31);
      matchQuery.transactionDate = { $gte: yearStart, $lte: yearEnd };
    }

    const summary = await leaveLedger.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$employeeId',
          totalDays: { $sum: { $abs: '$amount' } },
          transactions: { $sum: 1 },
          leaveTypes: { $addToSet: '$leaveType' },
        },
      },
      {
        $lookup: {
          from: 'employees',
          localField: '_id',
          foreignField: 'employeeId',
          as: 'employee',
        },
      },
      {
        $unwind: '$employee',
      },
      {
        $project: {
          employeeId: '$_id',
          employeeName: { $concat: ['$employee.firstName', ' ', '$employee.lastName'] },
          totalDays: 1,
          transactions: 1,
          leaveTypes: 1,
        },
      },
      { $sort: { totalDays: -1 } },
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
  getEncashmentConfig,
  calculateEncashment,
  executeEncashment,
  getEncashmentHistory,
  getEncashmentSummary,
};
