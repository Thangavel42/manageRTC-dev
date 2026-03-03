/**
 * Extended Profile REST API Hook
 * Phase 2: Fetches read-only sections for the profile page
 * - Work Info (shift, batch, timezone)
 * - Salary (basic, HRA, allowances, CTC)
 * - Statutory (PF, ESI)
 * - Assets (assigned items)
 * - Career (promotions, policies, resignation, termination)
 */

import { useCallback, useState } from 'react';
import { get, handleApiError } from '../services/api';

// ─────────────────────────────────────────────────────────────────────────────
// Types for Extended Profile Data
// ─────────────────────────────────────────────────────────────────────────────

export interface ShiftInfo {
  _id: string;
  name: string;
  code?: string;
  startTime: string;
  endTime: string;
  duration: number;
  color: string;
  type: 'regular' | 'night' | 'rotating' | 'flexible' | 'custom';
  isNightShift: boolean;
}

export interface BatchShiftInfo {
  _id: string;
  name: string;
  code?: string;
  startTime: string;
  endTime: string;
  color: string;
}

export interface BatchInfo {
  _id: string;
  name: string;
  code?: string;
  shift: BatchShiftInfo | null;
}

export interface WorkInfo {
  employmentType: string | null;
  timezone: string;
  shift: ShiftInfo | null;
  batch: BatchInfo | null;
}

export interface SalaryInfo {
  basic: number;
  hra: number;
  allowances: number;
  totalCTC: number;
  currency: 'USD' | 'EUR' | 'GBP' | 'INR' | 'AED' | 'SAR';
}

export interface StatutoryInfo {
  pfContribution: number;
  esiContribution: number;
  lastPayPeriod: {
    start: string | Date;
    end: string | Date;
  } | null;
}

export interface AssetInfo {
  _id: string;
  assetId: string;
  assetName: string;
  category: string | null;
  serialNumber: string | null;
  status: string;
  assignedDate: string | Date;
  returnDate: string | Date | null;
  notes: string | null;
  image: string | null;
}

export interface PromotionInfo {
  _id: string;
  effectiveDate: string | Date;
  promotionType: string;
  previousDesignation: string | null;
  newDesignation: string | null;
  previousDepartment: string | null;
  newDepartment: string | null;
  salaryChange: {
    previousSalary: number;
    newSalary: number;
    increment: number;
  } | null;
  status: string;
  notes: string | null;
}

export interface ResignationInfo {
  _id: string;
  noticeDate: string | Date;
  resignationDate: string | Date;
  lastWorkingDay: string | Date;
  reason: string | null;
  status: string;
}

export interface TerminationInfo {
  _id: string;
  terminationDate: string | Date;
  reason: string | null;
  type: string | null;
  noticePeriodServed: boolean;
}

export interface PolicyInfo {
  _id: string;
  name: string;
  description: string | null;
  effectiveDate: string | Date;
  category: string | null;
  status: string;
}

export interface CareerHistory {
  promotions: PromotionInfo[];
  resignation: ResignationInfo | null;
  termination: TerminationInfo | null;
  policies: PolicyInfo[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extended Profile Hook
 * Fetches read-only sections for profile page tabs
 */
export const useProfileExtendedREST = () => {
  const [workInfo, setWorkInfo] = useState<WorkInfo | null>(null);
  const [salaryInfo, setSalaryInfo] = useState<SalaryInfo | null>(null);
  const [statutoryInfo, setStatutoryInfo] = useState<StatutoryInfo | null>(null);
  const [myAssets, setMyAssets] = useState<AssetInfo[]>([]);
  const [careerHistory, setCareerHistory] = useState<CareerHistory | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Work Info
  const fetchWorkInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await get<WorkInfo>('/user-profile/work-info');
      if (response.success && response.data) {
        setWorkInfo(response.data);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch work info');
      }
    } catch (err) {
      const errorMsg = handleApiError(err);
      setError(errorMsg);
      console.error('[useProfileExtendedREST] Error fetching work info:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Salary Info
  const fetchSalaryInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await get<SalaryInfo>('/user-profile/salary');
      if (response.success && response.data) {
        setSalaryInfo(response.data);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch salary info');
      }
    } catch (err) {
      const errorMsg = handleApiError(err);
      setError(errorMsg);
      console.error('[useProfileExtendedREST] Error fetching salary info:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Statutory Info
  const fetchStatutoryInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await get<StatutoryInfo>('/user-profile/statutory');
      if (response.success && response.data) {
        setStatutoryInfo(response.data);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch statutory info');
      }
    } catch (err) {
      const errorMsg = handleApiError(err);
      setError(errorMsg);
      console.error('[useProfileExtendedREST] Error fetching statutory info:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch My Assets
  const fetchMyAssets = useCallback(async (status?: string) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = status ? `?status=${status}` : '';
      const response = await get<AssetInfo[]>(`/user-profile/assets${queryParams}`);
      if (response.success && response.data) {
        setMyAssets(response.data);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch assets');
      }
    } catch (err) {
      const errorMsg = handleApiError(err);
      setError(errorMsg);
      console.error('[useProfileExtendedREST] Error fetching assets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Career History
  const fetchCareerHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await get<CareerHistory>('/user-profile/career');
      if (response.success && response.data) {
        setCareerHistory(response.data);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch career history');
      }
    } catch (err) {
      const errorMsg = handleApiError(err);
      setError(errorMsg);
      console.error('[useProfileExtendedREST] Error fetching career history:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch all sections at once
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchWorkInfo(),
        fetchSalaryInfo(),
        fetchStatutoryInfo(),
        fetchMyAssets(),
        fetchCareerHistory(),
      ]);
    } catch (err) {
      const errorMsg = handleApiError(err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [fetchWorkInfo, fetchSalaryInfo, fetchStatutoryInfo, fetchMyAssets, fetchCareerHistory]);

  return {
    // Data
    workInfo,
    salaryInfo,
    statutoryInfo,
    myAssets,
    careerHistory,

    // State
    loading,
    error,

    // Operations
    fetchWorkInfo,
    fetchSalaryInfo,
    fetchStatutoryInfo,
    fetchMyAssets,
    fetchCareerHistory,
    fetchAll,
  };
};
