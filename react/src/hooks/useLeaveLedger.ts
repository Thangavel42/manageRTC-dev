/**
 * Leave Ledger Hook
 * Fetches and manages leave balance history data
 */

import { message } from 'antd';
import { useCallback, useState } from 'react';
import { ApiResponse, buildParams, get } from '../services/api';

export type LeaveType = 'sick' | 'casual' | 'earned' | 'maternity' | 'paternity' | 'bereavement' | 'compensatory' | 'unpaid' | 'special';

export type TransactionType = 'opening' | 'allocated' | 'used' | 'restored' | 'carry_forward' | 'encashed' | 'adjustment' | 'expired';

export interface LedgerTransaction {
  _id: string;
  employeeId: string;
  companyId: string;
  leaveType: LeaveType;
  transactionType: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  leaveId?: string;
  leaveRequestId?: string;
  transactionDate: string;
  financialYear: string;
  year: number;
  month: number;
  description: string;
  details?: {
    startDate?: string;
    endDate?: string;
    duration?: number;
    reason?: string;
  };
  changedBy?: {
    firstName: string;
    lastName: string;
    employeeId: string;
  };
  changedByUserId?: string;
  adjustmentReason?: string;
  attachments?: Array<{
    filename: string;
    url: string;
    uploadedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

// Balance summary is now keyed by leaveTypeId (ObjectId string) instead of leaveTypeCode (string)
// Example: { "6997ddbf244f4b67d04bf3c2": { total: 15, used: 2, balance: 13, ... } }
export interface BalanceSummary {
  [leaveTypeId: string]: {
    total: number;
    used: number;
    balance: number;
    ledgerBalance: number;
    lastTransaction: string | null;
    yearlyStats: {
      allocated: number;
      used: number;
      restored: number;
    };
    // Dynamic fields from company's leaveTypes collection
    leaveTypeName?: string;
    isPaid?: boolean;
    annualQuota?: number;
    // Custom policy information
    hasCustomPolicy?: boolean;
    customPolicyId?: string;
    customPolicyName?: string;
    customDays?: number;
  };
}

export interface BalanceHistoryResponse {
  transactions: LedgerTransaction[];
  summary: {
    [leaveType: string]: {
      totalAllocated: number;
      totalUsed: number;
      totalRestored: number;
      totalEncashed: number;
      currentBalance: number;
      transactionCount: number;
    };
  };
}

export interface LedgerFilters {
  leaveType?: LeaveType;
  startDate?: string;
  endDate?: string;
  year?: number;
  limit?: number;
}

// Transaction type display mapping
export const transactionTypeDisplayMap: Record<TransactionType, { label: string; color: string; icon: string }> = {
  opening: { label: 'Opening Balance', color: 'info', icon: 'ti ti-circle-plus' },
  allocated: { label: 'Leave Allocated', color: 'success', icon: 'ti ti-circle-plus' },
  used: { label: 'Leave Used', color: 'warning', icon: 'ti ti-circle-minus' },
  restored: { label: 'Leave Restored', color: 'success', icon: 'ti ti-refresh' },
  carry_forward: { label: 'Carried Forward', color: 'primary', icon: 'ti ti-arrows-right' },
  encashed: { label: 'Leave Encashed', color: 'purple', icon: 'ti ti-money' },
  adjustment: { label: 'Manual Adjustment', color: 'orange', icon: 'ti ti-adjustments' },
  expired: { label: 'Leave Expired', color: 'danger', icon: 'ti ti-circle-x' },
};

/**
 * Transform backend summary to frontend format
 *
 * IMPORTANT: The backend now returns summary keyed by leaveTypeId (ObjectId string)
 * Example: { "6997ddbf244f4b67d04bf3c2": { total: 15, used: 2, balance: 13, ... } }
 *
 * This function handles the response and passes through all fields directly.
 */
const transformSummary = (backendSummary: any): BalanceSummary => {
  const result: BalanceSummary = {};

  for (const [leaveTypeId, data] of Object.entries(backendSummary)) {
    const dataObj = data as any;

    // Backend returns summary keyed by leaveTypeId (ObjectId string)
    // Just pass through all fields - they already have the correct structure
    result[leaveTypeId] = {
      // calculateSummary uses 'totalAllocated', getBalanceSummary uses 'total'
      total: dataObj.totalAllocated ?? dataObj.total ?? 0,
      // calculateSummary uses 'totalUsed', getBalanceSummary uses 'used'
      used: dataObj.totalUsed ?? dataObj.used ?? 0,
      // calculateSummary uses 'currentBalance', getBalanceSummary uses 'balance'
      balance: dataObj.currentBalance ?? dataObj.balance ?? 0,
      // Only available in getBalanceSummary
      ledgerBalance: dataObj.ledgerBalance ?? dataObj.currentBalance ?? dataObj.balance ?? 0,
      // Only available in getBalanceSummary
      lastTransaction: dataObj.lastTransaction ?? null,
      yearlyStats: {
        allocated: dataObj.totalAllocated ?? dataObj.yearlyStats?.allocated ?? 0,
        used: dataObj.totalUsed ?? dataObj.yearlyStats?.used ?? 0,
        restored: dataObj.totalRestored ?? dataObj.yearlyStats?.restored ?? 0,
      },
      // Dynamic fields from company's leaveTypes collection
      leaveTypeName: dataObj.leaveTypeName,
      isPaid: dataObj.isPaid !== undefined ? dataObj.isPaid : true,
      annualQuota: dataObj.annualQuota ?? 0,
      // Custom policy information
      hasCustomPolicy: dataObj.hasCustomPolicy,
      customPolicyId: dataObj.customPolicyId,
      customPolicyName: dataObj.customPolicyName,
      customDays: dataObj.customDays,
    };
  }

  return result;
};

/**
 * Leave Ledger Hook
 */
export const useLeaveLedger = () => {
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [summary, setSummary] = useState<BalanceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch my balance history
   */
  const fetchMyBalanceHistory = useCallback(async (filters: LedgerFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildParams(filters);
      const response: ApiResponse<BalanceHistoryResponse> = await get('/leaves/ledger/my', { params });

      if (response.success && response.data) {
        setTransactions(response.data.transactions || []);
        setSummary(response.data.summary ? transformSummary(response.data.summary) : null);
        return response.data;
      }
      throw new Error(response.error?.message || 'Failed to fetch balance history');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch balance history';
      setError(errorMessage);
      message.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch employee balance history (for HR/Admin)
   */
  const fetchEmployeeBalanceHistory = useCallback(async (employeeId: string, filters: LedgerFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildParams(filters);
      const response: ApiResponse<BalanceHistoryResponse> = await get(`/leaves/ledger/employee/${employeeId}`, { params });

      if (response.success && response.data) {
        setTransactions(response.data.transactions || []);
        setSummary(response.data.summary ? transformSummary(response.data.summary) : null);
        return response.data;
      }
      throw new Error(response.error?.message || 'Failed to fetch employee balance history');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch employee balance history';
      setError(errorMessage);
      message.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch my balance summary
   */
  const fetchMyBalanceSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<BalanceSummary> = await get('/leaves/ledger/my/summary');

      if (response.success && response.data) {
        setSummary(response.data);
        return response.data;
      }
      throw new Error(response.error?.message || 'Failed to fetch balance summary');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch balance summary';
      setError(errorMessage);
      message.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch employee balance summary (for HR/Admin)
   */
  const fetchEmployeeBalanceSummary = useCallback(async (employeeId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<BalanceSummary> = await get(`/leaves/ledger/employee/${employeeId}/summary`);

      if (response.success && response.data) {
        setSummary(response.data);
        return response.data;
      }
      throw new Error(response.error?.message || 'Failed to fetch employee balance summary');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch employee balance summary';
      setError(errorMessage);
      message.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch balance history by financial year
   */
  const fetchByFinancialYear = useCallback(async (financialYear: string) => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<any> = await get(`/leaves/ledger/financial-year/${financialYear}`);

      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error?.message || 'Failed to fetch financial year history');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch financial year history';
      setError(errorMessage);
      message.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Export balance history
   */
  const exportBalanceHistory = useCallback(async (employeeId?: string, filters: LedgerFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildParams(filters);
      const url = employeeId ? `/leaves/ledger/export/${employeeId}` : '/leaves/ledger/export';
      const response: ApiResponse<any> = await get(url, { params });

      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error?.message || 'Failed to export balance history');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to export balance history';
      setError(errorMessage);
      message.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    transactions,
    summary,
    loading,
    error,
    fetchMyBalanceHistory,
    fetchEmployeeBalanceHistory,
    fetchMyBalanceSummary,
    fetchEmployeeBalanceSummary,
    fetchByFinancialYear,
    exportBalanceHistory,
  };
};

export default useLeaveLedger;
