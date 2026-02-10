/**
 * Promotions REST API Hook
 * Replaces Socket.IO-based promotion operations with REST API calls
 */

import { message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { ApiResponse, buildParams, del, get, post, put } from '../services/api';

export interface Promotion {
  _id: string;
  promotionId: string;
  employeeId: string;
  employeeName?: string;
  promotionFrom: {
    departmentId: string;
    department?: string;
    designationId: string;
    designation?: string;
    salary?: number;
  };
  promotionTo: {
    departmentId: string;
    department?: string;
    designationId: string;
    designation?: string;
    salary?: number;
  };
  promotionDate: string;
  promotionType?: 'Regular' | 'Acting' | 'Charge' | 'Transfer' | 'Other';
  reason?: string;
  status: 'pending' | 'approved' | 'applied' | 'cancelled' | 'rejected';
  isDue?: boolean;
  notes?: string;
  createdBy?: {
    userId: string;
    userName?: string;
  };
  createdAt: string;
  updatedAt: string;
  appliedAt?: string;
  cancellationReason?: string;
}

export interface PromotionFilters {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  departmentId?: string;
  employeeId?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export interface PromotionStats {
  total: number;
  pending: number;
  approved: number;
  applied: number;
  cancelled: number;
  due: number;
}

export interface Department {
  _id: string;
  department: string;
  status?: string;
}

export interface Designation {
  _id: string;
  designation: string;
  departmentId: string;
  status?: string;
}

export interface CreatePromotionRequest {
  employeeId: string;
  promotionFrom: {
    departmentId: string;
    designationId: string;
  };
  promotionTo: {
    departmentId: string;
    designationId: string;
  };
  promotionDate: string;
  promotionType?: 'Regular' | 'Acting' | 'Charge' | 'Transfer' | 'Other';
  reason?: string;
  notes?: string;
}

/**
 * Promotions REST API Hook
 */
export const usePromotionsREST = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [stats, setStats] = useState<PromotionStats | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch promotions with filters
   * REST API: GET /api/promotions
   * Note: The API interceptor handles token refresh automatically
   */
  const fetchPromotions = useCallback(async (filters: PromotionFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildParams(filters);
      const response: ApiResponse<Promotion[]> = await get('/promotions', { params });

      if (response.success && response.data) {
        setPromotions(response.data);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch promotions');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch promotions';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch promotion statistics
   * REST API: GET /api/promotions/stats
   * Note: The API interceptor handles token refresh automatically
   */
  const fetchStats = useCallback(async () => {
    try {
      const response: ApiResponse<PromotionStats> = await get('/promotions/stats');

      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err: any) {
      console.error('[usePromotionsREST] Failed to fetch stats:', err);
    }
  }, []);

  /**
   * Get single promotion by ID
   * REST API: GET /api/promotions/:id
   */
  const getPromotionById = useCallback(async (promotionId: string): Promise<Promotion | null> => {
    try {
      const response: ApiResponse<Promotion> = await get(`/promotions/${promotionId}`);

      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error?.message || 'Failed to fetch promotion');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch promotion';
      message.error(errorMessage);
      return null;
    }
  }, []);

  /**
   * Create new promotion
   * REST API: POST /api/promotions
   */
  const createPromotion = useCallback(async (
    promotionData: CreatePromotionRequest
  ): Promise<{ success: boolean; promotion?: Promotion; error?: any }> => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<Promotion> = await post('/promotions', promotionData);

      if (response.success && response.data) {
        message.success('Promotion created successfully!');
        await fetchPromotions();
        return { success: true, promotion: response.data };
      }
      throw new Error(response.error?.message || 'Failed to create promotion');
    } catch (err: any) {
      const errorResponse = err.response?.data;
      const errorMessage = errorResponse?.error?.message || err.message || 'Failed to create promotion';

      setError(errorMessage);
      message.error(errorMessage);
      return { success: false, error: errorResponse?.error || errorMessage };
    } finally {
      setLoading(false);
    }
  }, [fetchPromotions]);

  /**
   * Update promotion
   * REST API: PUT /api/promotions/:id
   */
  const updatePromotion = useCallback(async (
    promotionId: string,
    updateData: Partial<Promotion>
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<Promotion> = await put(`/promotions/${promotionId}`, updateData);

      if (response.success && response.data) {
        message.success('Promotion updated successfully!');
        await fetchPromotions();
        return true;
      }
      throw new Error(response.error?.message || 'Failed to update promotion');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to update promotion';
      setError(errorMessage);
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchPromotions]);

  /**
   * Delete promotion
   * REST API: DELETE /api/promotions/:id
   */
  const deletePromotion = useCallback(async (promotionId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse = await del(`/promotions/${promotionId}`);

      if (response.success) {
        message.success('Promotion deleted successfully!');
        await fetchPromotions();
        return true;
      }
      throw new Error(response.error?.message || 'Failed to delete promotion');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to delete promotion';
      setError(errorMessage);
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchPromotions]);

  /**
   * Apply promotion
   * REST API: PUT /api/promotions/:id/apply
   */
  const applyPromotion = useCallback(async (promotionId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<Promotion> = await put(`/promotions/${promotionId}/apply`);

      if (response.success) {
        message.success('Promotion applied successfully!');
        await fetchPromotions();
        return true;
      }
      throw new Error(response.error?.message || 'Failed to apply promotion');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to apply promotion';
      setError(errorMessage);
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchPromotions]);

  /**
   * Cancel promotion
   * REST API: PUT /api/promotions/:id/cancel
   */
  const cancelPromotion = useCallback(async (
    promotionId: string,
    reason: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<Promotion> = await put(`/promotions/${promotionId}/cancel`, { reason });

      if (response.success) {
        message.success('Promotion cancelled successfully!');
        await fetchPromotions();
        return true;
      }
      throw new Error(response.error?.message || 'Failed to cancel promotion');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to cancel promotion';
      setError(errorMessage);
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchPromotions]);

  /**
   * Fetch departments for promotion selection
   * REST API: GET /api/promotions/departments
   * Note: The API interceptor handles token refresh automatically
   */
  const fetchDepartments = useCallback(async () => {
    try {
      const response: ApiResponse<Department[]> = await get('/promotions/departments');

      if (response.success && response.data) {
        setDepartments(response.data);
      }
    } catch (err: any) {
      console.error('[usePromotionsREST] Failed to fetch departments:', err);
    }
  }, []);

  /**
   * Fetch designations for promotion selection
   * REST API: GET /api/promotions/designations
   * Note: The API interceptor handles token refresh automatically
   */
  const fetchDesignations = useCallback(async (departmentId?: string) => {
    try {
      const params = departmentId ? { departmentId } : {};
      const response: ApiResponse<Designation[]> = await get('/promotions/designations', { params });

      if (response.success && response.data) {
        setDesignations(response.data);
        return response.data;
      }
      return [];
    } catch (err: any) {
      console.error('[usePromotionsREST] Failed to fetch designations:', err);
      return [];
    }
  }, []);

  // Initial data fetch
  // The API interceptor handles token refresh automatically
  useEffect(() => {
    fetchPromotions();
    fetchStats();
    fetchDepartments();
  }, []);

  return {
    promotions,
    stats,
    departments,
    designations,
    loading,
    error,
    fetchPromotions,
    fetchStats,
    getPromotionById,
    createPromotion,
    updatePromotion,
    deletePromotion,
    applyPromotion,
    cancelPromotion,
    fetchDepartments,
    fetchDesignations
  };
};

export default usePromotionsREST;
