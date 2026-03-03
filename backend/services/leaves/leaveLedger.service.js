/**
 * Leave Ledger Service
 * Handles all leave balance ledger operations using native MongoDB driver
 * (multi-tenant architecture - data lives in company-specific databases)
 */

import { getTenantCollections } from '../../config/db.js';

// Hardcoded types as fallback - will be overridden by company's leaveTypes collection
const FALLBACK_LEAVE_TYPES = ['casual', 'sick', 'earned', 'compensatory', 'maternity', 'paternity', 'bereavement', 'unpaid', 'special'];

/**
 * Get active leave types for a company from the database
 * Returns lowercase codes to match ledger storage format (legacy)
 */
const getActiveLeaveTypesForCompany = async (companyId) => {
  try {
    const { leaveTypes } = getTenantCollections(companyId);
    const activeTypes = await leaveTypes.find({
      companyId,
      isActive: true,
      isDeleted: { $ne: true }
    }).toArray();

    // Return lowercase codes to match ledger format (ledger stores as 'casual', 'sick', etc.)
    return activeTypes.map(lt => lt.code.toLowerCase());
  } catch (error) {
    console.error('[LeaveLedger] Error fetching leave types from database, using fallback:', error);
    return FALLBACK_LEAVE_TYPES;
  }
};

/**
 * Get active leave types with ObjectId for a company
 * Returns array of { _id, code, name, annualQuota, isPaid, color }
 * Used for modern ObjectId-based lookups
 */
const getActiveLeaveTypesWithIds = async (companyId) => {
  try {
    const { leaveTypes } = getTenantCollections(companyId);
    const activeTypes = await leaveTypes.find({
      companyId,
      isActive: true,
      isDeleted: { $ne: true }
    }).toArray();

    return activeTypes.map(lt => ({
      _id: lt._id.toString(),
      code: lt.code.toLowerCase(),
      name: lt.name,
      annualQuota: lt.annualQuota || 0,
      isPaid: lt.isPaid,
      color: lt.color
    }));
  } catch (error) {
    console.error('[LeaveLedger] Error fetching leave types from database:', error);
    return [];
  }
};

/**
 * Get leave type details (name, annualQuota, etc.) for a company
 * Returns map keyed by lowercase code (legacy)
 */
const getLeaveTypeDetailsMap = async (companyId) => {
  try {
    const { leaveTypes } = getTenantCollections(companyId);
    const activeTypes = await leaveTypes.find({
      companyId,
      isActive: true,
      isDeleted: { $ne: true }
    }).toArray();

    const detailsMap = {};
    activeTypes.forEach(lt => {
      detailsMap[lt.code.toLowerCase()] = {
        name: lt.name,
        code: lt.code.toLowerCase(),
        annualQuota: lt.annualQuota || 0,
        isPaid: lt.isPaid,
        color: lt.color
      };
    });
    return detailsMap;
  } catch (error) {
    console.error('[LeaveLedger] Error fetching leave type details:', error);
    return {};
  }
};

/**
 * Get the latest ledger entry for an employee + leave type
 * @param {Collection} leaveLedger - Ledger collection
 * @param {string} employeeId - Employee ID
 * @param {string} leaveType - Leave type code (legacy)
 * @param {ClientSession} session - Optional MongoDB session for transaction support
 */
const getLatestEntry = async (leaveLedger, employeeId, leaveType, session = null) => {
  const options = session ? { session } : {};
  const entries = await leaveLedger.find(
    { employeeId, leaveType, isDeleted: { $ne: true } },
    { ...options, sort: { transactionDate: -1 }, limit: 1 }
  ).toArray();
  return entries[0] || null;
};

/**
 * Get the latest ledger entry for an employee + leave type by ObjectId
 * @param {Collection} leaveLedger - Ledger collection
 * @param {string} employeeId - Employee ID
 * @param {string} leaveTypeId - Leave type ObjectId (modern)
 * @param {ClientSession} session - Optional MongoDB session for transaction support
 */
const getLatestEntryByTypeId = async (leaveLedger, employeeId, leaveTypeId, session = null) => {
  const options = session ? { session } : {};
  const entries = await leaveLedger.find(
    { employeeId, leaveTypeId, isDeleted: { $ne: true } },
    { ...options, sort: { transactionDate: -1 }, limit: 1 }
  ).toArray();
  return entries[0] || null;
};

/**
 * Calculate financial year string
 */
const getFinancialYear = (year) => `FY${year}-${year + 1}`;

/**
 * Get balance history for an employee
 */
export const getBalanceHistory = async (companyId, employeeId, filters = {}) => {
  try {
    const { leaveType, startDate, endDate, year, limit = 100 } = filters;
    const { leaveLedger } = getTenantCollections(companyId);

    const query = { companyId, employeeId, isDeleted: { $ne: true } };

    if (leaveType) query.leaveType = leaveType;
    if (startDate || endDate) {
      query.transactionDate = {};
      if (startDate) query.transactionDate.$gte = new Date(startDate);
      if (endDate) query.transactionDate.$lte = new Date(endDate);
    }
    if (year) query.year = parseInt(year);

    const transactions = await leaveLedger
      .find(query, { sort: { transactionDate: -1 }, limit: parseInt(limit) })
      .toArray();

    const summary = await calculateSummary(leaveLedger, companyId, employeeId, leaveType, year);

    return { success: true, data: { transactions, summary } };
  } catch (error) {
    console.error('Error fetching balance history:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get balance summary for all leave types
 * Fetches active leave types from company's database dynamically
 * Returns summary keyed by leaveTypeId (ObjectId string) for modern ObjectId-based lookups
 * Also checks for custom policies that override default leave quotas
 */
export const getBalanceSummary = async (companyId, employeeId) => {
  try {
    const { leaveLedger, employees, customLeavePolicies, leaveTypes } = getTenantCollections(companyId);

    const employee = await employees.findOne({ employeeId, isDeleted: { $ne: true } });

    // Fetch active leave types with ObjectId from company's database
    const leaveTypesWithIds = await getActiveLeaveTypesWithIds(companyId);

    // Create a map of lowercase code -> leave type details for legacy lookups
    const leaveTypeDetailsByCode = {};
    leaveTypesWithIds.forEach(lt => {
      leaveTypeDetailsByCode[lt.code] = lt;
    });

    // Fetch active custom policies for this employee
    const employeeCustomPolicies = await customLeavePolicies.find({
      isActive: true,
      employeeIds: { $in: [employeeId] },
      isDeleted: { $ne: true }
    }).toArray();

    // Create a map of leaveTypeId -> custom policy details for quick lookup
    // Stores: { annualQuota, policyId, policyName }
    const customPolicyQuotaMap = {};
    for (const policy of employeeCustomPolicies) {
      if (policy.leaveTypeId && policy.annualQuota !== undefined) {
        const leaveTypeIdStr = policy.leaveTypeId.toString();
        customPolicyQuotaMap[leaveTypeIdStr] = {
          annualQuota: policy.annualQuota,
          policyId: policy._id?.toString(),
          policyName: policy.name || 'Custom Policy'
        };
      }
    }

    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59);

    const summary = {};

    for (const leaveType of leaveTypesWithIds) {
      const { _id, code, name, annualQuota, isPaid } = leaveType;

      // Try to get latest entry by leaveTypeId first (modern approach)
      let latestEntry = await getLatestEntryByTypeId(leaveLedger, employeeId, _id);

      // Fall back to legacy code-based lookup if no entry with leaveTypeId
      if (!latestEntry) {
        latestEntry = await getLatestEntry(leaveLedger, employeeId, code);
      }

      const employeeBalance = employee?.leaveBalance?.balances?.find(b => b.type === code);

      // Check if there's a custom policy for this leave type (by ObjectId)
      const customPolicy = customPolicyQuotaMap[_id];
      const hasCustomPolicy = customPolicy !== undefined;
      const customQuota = customPolicy?.annualQuota;

      // Use custom policy annualQuota if available, otherwise use company's annualQuota
      const defaultQuota = annualQuota || 0;

      // PRIORITIZE LEDGER: Use ledger balance if available, otherwise fall back to employee balance
      // The ledger is the single source of truth for current balance
      const baseBalance = latestEntry ? latestEntry.balanceAfter : null;

      // total = annual quota (custom policy quota OR default quota OR employee embedded total)
      // balance = current remaining balance (from ledger OR employee embedded balance)
      const total = hasCustomPolicy ? customQuota : (employeeBalance?.total ?? defaultQuota);
      const balance = hasCustomPolicy ? customQuota : (baseBalance ?? employeeBalance?.balance ?? defaultQuota);

      const [allocated, usedCount, restored] = await Promise.all([
        leaveLedger.countDocuments({
          $or: [{ leaveTypeId: _id }, { leaveType: code }],
          companyId,
          employeeId,
          transactionType: 'allocated',
          transactionDate: { $gte: yearStart, $lte: yearEnd },
          isDeleted: { $ne: true }
        }),
        leaveLedger.countDocuments({
          $or: [{ leaveTypeId: _id }, { leaveType: code }],
          companyId,
          employeeId,
          transactionType: 'used',
          transactionDate: { $gte: yearStart, $lte: yearEnd },
          isDeleted: { $ne: true }
        }),
        leaveLedger.countDocuments({
          $or: [{ leaveTypeId: _id }, { leaveType: code }],
          companyId,
          employeeId,
          transactionType: 'restored',
          transactionDate: { $gte: yearStart, $lte: yearEnd },
          isDeleted: { $ne: true }
        }),
      ]);

      // KEY CHANGE: Return summary keyed by ObjectId (_id) instead of code (string)
      summary[_id] = {
        total,
        used: employeeBalance?.used || 0,
        balance,
        ledgerBalance: latestEntry?.balanceAfter || balance,
        lastTransaction: latestEntry?.transactionDate || null,
        yearlyStats: { allocated, used: usedCount, restored },
        // Include leave type details for frontend display
        leaveTypeName: name || code,
        isPaid: isPaid !== false, // Default to paid
        annualQuota: annualQuota || 0,
        // Include custom policy information
        hasCustomPolicy,
        customPolicyId: hasCustomPolicy ? customPolicy.policyId : undefined,
        customPolicyName: hasCustomPolicy ? customPolicy.policyName : undefined,
        customDays: hasCustomPolicy ? customQuota : undefined,
      };
    }

    return { success: true, data: summary };
  } catch (error) {
    console.error('Error fetching balance summary:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Calculate aggregate summary statistics
 */
const calculateSummary = async (leaveLedger, companyId, employeeId, leaveType, year) => {
  const matchQuery = { companyId, employeeId, isDeleted: { $ne: true } };
  if (leaveType) matchQuery.leaveType = leaveType;
  if (year) matchQuery.year = parseInt(year);

  const pipeline = [
    { $match: matchQuery },
    {
      $group: {
        _id: '$leaveType',
        totalAllocated: { $sum: { $cond: [{ $eq: ['$transactionType', 'allocated'] }, '$amount', 0] } },
        totalUsed: { $sum: { $cond: [{ $eq: ['$transactionType', 'used'] }, { $abs: '$amount' }, 0] } },
        totalRestored: { $sum: { $cond: [{ $eq: ['$transactionType', 'restored'] }, '$amount', 0] } },
        totalEncashed: { $sum: { $cond: [{ $eq: ['$transactionType', 'encashed'] }, '$amount', 0] } },
        currentBalance: { $last: '$balanceAfter' },
        transactionCount: { $sum: 1 },
      },
    },
  ];

  const aggregateResult = await leaveLedger.aggregate(pipeline).toArray();
  const result = {};
  aggregateResult.forEach(item => {
    result[item._id] = {
      totalAllocated: item.totalAllocated,
      totalUsed: item.totalUsed,
      totalRestored: item.totalRestored,
      totalEncashed: item.totalEncashed,
      currentBalance: item.currentBalance,
      transactionCount: item.transactionCount,
    };
  });
  return result;
};

/**
 * Get balance history by financial year
 */
export const getBalanceHistoryByFinancialYear = async (companyId, employeeId, financialYear) => {
  try {
    const { leaveLedger } = getTenantCollections(companyId);

    const transactions = await leaveLedger
      .find(
        { companyId, employeeId, financialYear, isDeleted: { $ne: true } },
        { sort: { transactionDate: -1 } }
      )
      .toArray();

    const byLeaveType = transactions.reduce((acc, tx) => {
      if (!acc[tx.leaveType]) acc[tx.leaveType] = [];
      acc[tx.leaveType].push(tx);
      return acc;
    }, {});

    const yearNum = financialYear.replace('FY', '').split('-')[0];
    const summary = await calculateSummary(leaveLedger, companyId, employeeId, null, yearNum);

    return { success: true, data: { financialYear, transactions: byLeaveType, summary } };
  } catch (error) {
    console.error('Error fetching balance history by financial year:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Record leave usage in ledger (with balance validation)
 * @param {string} companyId - Company ID
 * @param {string} employeeId - Employee ID
 * @param {string} leaveType - Leave type code (lowercase)
 * @param {number} amount - Number of days
 * @param {string} leaveId - Leave request ID
 * @param {Date|string} startDate - Leave start date
 * @param {Date|string} endDate - Leave end date
 * @param {string} description - Description
 * @param {ClientSession} session - Optional MongoDB session for transaction support
 * @param {object} options - Additional options { skipBalanceCheck: boolean }
 * @returns {object} Created ledger entry
 * @throws {Error} If insufficient balance (unless skipBalanceCheck is true)
 */
export const recordLeaveUsage = async (
  companyId,
  employeeId,
  leaveType,
  amount,
  leaveId,
  startDate,
  endDate,
  description,
  session = null,
  options = {}
) => {
  const { skipBalanceCheck = false, allowNegative = false } = options;
  const { leaveLedger } = getTenantCollections(companyId);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Get latest balance using session if provided
  const latestEntry = await getLatestEntry(leaveLedger, employeeId, leaveType, session);
  const balanceBefore = latestEntry ? latestEntry.balanceAfter : 0;
  const balanceAfter = balanceBefore - amount;

  // PHASE 1 FIX: Balance validation before recording usage
  if (!skipBalanceCheck && !allowNegative && balanceAfter < 0) {
    const error = new Error(
      `Insufficient leave balance for ${leaveType}. ` +
      `Available: ${balanceBefore} days, Required: ${amount} days, Shortfall: ${Math.abs(balanceAfter)} days`
    );
    error.code = 'INSUFFICIENT_BALANCE';
    error.details = {
      employeeId,
      leaveType,
      balanceBefore,
      requested: amount,
      shortfall: Math.abs(balanceAfter)
    };
    throw error;
  }

  const entry = {
    employeeId,
    companyId,
    leaveType,
    transactionType: 'used',
    amount: -amount,
    balanceBefore,
    balanceAfter,
    leaveRequestId: leaveId,
    transactionDate: now,
    financialYear: getFinancialYear(year),
    year,
    month,
    description: description || 'Leave used',
    details: { startDate, endDate, duration: amount },
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };

  // Use session if provided (for transaction support)
  const optionsMongo = session ? { session } : {};
  const result = await leaveLedger.insertOne(entry, optionsMongo);

  return { ...entry, _id: result.insertedId };
};

/**
 * Record leave restoration in ledger
 * @param {string} companyId - Company ID
 * @param {string} employeeId - Employee ID
 * @param {string} leaveType - Leave type code (lowercase)
 * @param {number} amount - Number of days
 * @param {string} leaveId - Leave request ID
 * @param {string} description - Description
 * @param {ClientSession} session - Optional MongoDB session for transaction support
 */
export const recordLeaveRestoration = async (companyId, employeeId, leaveType, amount, leaveId, description, session = null) => {
  const { leaveLedger } = getTenantCollections(companyId);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Get latest balance using session if provided
  const latestEntry = await getLatestEntry(leaveLedger, employeeId, leaveType, session);
  const balanceBefore = latestEntry ? latestEntry.balanceAfter : 0;
  const balanceAfter = balanceBefore + amount;

  const entry = {
    employeeId,
    companyId,
    leaveType,
    transactionType: 'restored',
    amount,
    balanceBefore,
    balanceAfter,
    leaveRequestId: leaveId,
    transactionDate: now,
    financialYear: getFinancialYear(year),
    year,
    month,
    description: description || 'Leave restored after cancellation',
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };

  // Use session if provided (for transaction support)
  const options = session ? { session } : {};
  const result = await leaveLedger.insertOne(entry, options);

  return { ...entry, _id: result.insertedId };
};

/**
 * Record custom policy adjustment in ledger
 * Called when a custom leave policy is created, updated, or deleted
 * @param {string} companyId - Company ID
 * @param {string} employeeId - Employee ID
 * @param {string} leaveType - Leave type code (lowercase)
 * @param {number} customQuota - New custom quota (can be positive or negative adjustment)
 * @param {number} defaultQuota - Default company quota for this leave type
 * @param {string} policyName - Name of the custom policy
 * @param {string} policyId - ID of the custom policy
 * @param {ClientSession} session - Optional MongoDB session for transaction support
 */
export const recordCustomPolicyAdjustment = async (
  companyId,
  employeeId,
  leaveType,
  customQuota,
  defaultQuota,
  policyName,
  policyId,
  session = null
) => {
  const { leaveLedger } = getTenantCollections(companyId);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Get current balance from latest ledger entry
  const latestEntry = await getLatestEntry(leaveLedger, employeeId, leaveType, session);
  const currentBalance = latestEntry ? latestEntry.balanceAfter : defaultQuota;

  // Calculate adjustment: difference between custom quota and default quota
  // But if there are already used days, we need to adjust differently
  const adjustment = customQuota - defaultQuota;
  const balanceAfter = currentBalance + adjustment;

  const entry = {
    employeeId,
    companyId,
    leaveType,
    transactionType: 'custom_adjustment',
    amount: adjustment,
    balanceBefore: currentBalance,
    balanceAfter,
    customPolicyId: policyId,
    transactionDate: now,
    financialYear: getFinancialYear(year),
    year,
    month,
    description: `Custom policy "${policyName}" applied (${customQuota} days, ${adjustment >= 0 ? '+' : ''}${adjustment} adjustment)`,
    details: {
      customQuota,
      defaultQuota,
      adjustment,
      policyName,
      policyId
    },
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };

  // Use session if provided (for transaction support)
  const options = session ? { session } : {};
  const result = await leaveLedger.insertOne(entry, options);

  return { success: true, data: { ...entry, _id: result.insertedId } };
};

/**
 * Record custom policy reversal when policy is deleted
 * @param {string} companyId - Company ID
 * @param {string} employeeId - Employee ID
 * @param {string} leaveType - Leave type code (lowercase)
 * @param {number} previousCustomQuota - The custom quota that was being applied
 * @param {number} defaultQuota - Default company quota for this leave type
 * @param {string} policyName - Name of the custom policy being removed
 * @param {ClientSession} session - Optional MongoDB session
 */
export const recordCustomPolicyReversal = async (
  companyId,
  employeeId,
  leaveType,
  previousCustomQuota,
  defaultQuota,
  policyName,
  session = null
) => {
  const { leaveLedger } = getTenantCollections(companyId);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Get current balance from latest ledger entry
  const latestEntry = await getLatestEntry(leaveLedger, employeeId, leaveType, session);
  const currentBalance = latestEntry ? latestEntry.balanceAfter : previousCustomQuota;

  // Calculate reversal: negative of the previous adjustment
  const adjustment = defaultQuota - previousCustomQuota;
  const balanceAfter = currentBalance + adjustment;

  const entry = {
    employeeId,
    companyId,
    leaveType,
    transactionType: 'custom_adjustment',
    amount: adjustment,
    balanceBefore: currentBalance,
    balanceAfter,
    transactionDate: now,
    financialYear: getFinancialYear(year),
    year,
    month,
    description: `Custom policy "${policyName}" removed (reverted to default ${defaultQuota} days, ${adjustment >= 0 ? '+' : ''}${adjustment} adjustment)`,
    details: {
      previousCustomQuota,
      defaultQuota,
      adjustment,
      policyName,
      reverted: true
    },
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };

  // Use session if provided (for transaction support)
  const options = session ? { session } : {};
  const result = await leaveLedger.insertOne(entry, options);

  return { success: true, data: { ...entry, _id: result.insertedId } };
};

/**
 * Initialize ledger for new employee
 */
export const initializeEmployeeLedger = async (companyId, employeeId) => {
  try {
    const { leaveLedger, employees } = getTenantCollections(companyId);

    const employee = await employees.findOne({ employeeId, isDeleted: { $ne: true } });

    if (!employee || !employee.leaveBalance?.balances) {
      return { success: false, error: 'Employee not found or has no leave balances' };
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const entries = [];

    for (const balance of employee.leaveBalance.balances) {
      const entry = {
        employeeId,
        companyId,
        leaveType: balance.type,
        transactionType: 'opening',
        amount: 0,
        balanceBefore: 0,
        balanceAfter: balance.balance || 0,
        transactionDate: new Date(year, month - 1, 1),
        financialYear: getFinancialYear(year),
        year,
        month,
        description: 'Opening balance',
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      };
      const result = await leaveLedger.insertOne(entry);
      entries.push({ ...entry, _id: result.insertedId });
    }

    return { success: true, data: entries };
  } catch (error) {
    console.error('Error initializing employee ledger:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Export balance history for reports
 */
export const exportBalanceHistory = async (companyId, employeeId, filters = {}) => {
  try {
    const history = await getBalanceHistory(companyId, employeeId, filters);
    if (!history.success) return history;

    const exportData = history.data.transactions.map(tx => ({
      Date: new Date(tx.transactionDate).toLocaleDateString(),
      'Leave Type': tx.leaveType,
      'Transaction Type': tx.transactionType,
      Amount: tx.amount,
      'Balance Before': tx.balanceBefore,
      'Balance After': tx.balanceAfter,
      Description: tx.description,
      'Leave ID': tx.leaveRequestId || 'N/A',
    }));

    return { success: true, data: exportData };
  } catch (error) {
    console.error('Error exporting balance history:', error);
    return { success: false, error: error.message };
  }
};

export default {
  getBalanceHistory,
  getBalanceSummary,
  getBalanceHistoryByFinancialYear,
  recordLeaveUsage,
  recordLeaveRestoration,
  recordCustomPolicyAdjustment,
  recordCustomPolicyReversal,
  initializeEmployeeLedger,
  exportBalanceHistory,
};
