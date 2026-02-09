/**
 * Terminations REST API Hook
 * Replaces Socket.IO-based termination operations with REST API calls
 * Real-time updates still use Socket.IO listeners
 */

import { useState, useCallback } from 'react';
import { message } from 'antd';
import { get, post, put, del, buildParams, ApiResponse } from '../services/api';

export interface Termination {
  _id?: string;
  terminationId: string;
  employeeId: string;
  employeeName?: string;
  employee_id?: string;
  employeeImage?: string;
  department?: string;
  departmentId?: string;
  designation?: string;
  terminationDate: string;
  noticeDate: string;
  reason: string;
  terminationType: string;
  status: string;
  lastWorkingDate?: string;
  processedBy?: string;
  processedAt?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  created_at?: string;
}

export interface TerminationStats {
  totalTerminations: string;
  recentTerminations: string;
}

export interface TerminationFilters {
  type?: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thismonth' | 'lastmonth' | 'thisyear' | 'alltime';
  startDate?: string;
  endDate?: string;
}

/**
 * Terminations REST API Hook
 */
export const useTerminationsREST = () => {
  const [terminations, setTerminations] = useState<Termination[]>([]);
  const [stats, setStats] = useState<TerminationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch termination statistics
   * REST API: GET /api/terminations/stats
   */
  const fetchTerminationStats = useCallback(async () => {
    try {
      const response: ApiResponse<TerminationStats> = await get('/terminations/stats');

      if (response.success && response.data) {
        setStats(response.data);
        return response.data;
      }
      throw new Error(response.error?.message || 'Failed to fetch termination stats');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch termination stats';
      console.error(errorMessage);
      return null;
    }
  }, []);

  /**
   * Fetch all terminations with optional filters
   * REST API: GET /api/terminations
   */
  const fetchTerminations = useCallback(async (filters: TerminationFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildParams(filters);
      const response: ApiResponse<Termination[]> = await get('/terminations', { params });

      if (response.success && response.data) {
        setTerminations(response.data);
        return response.data;
      } else {
        throw new Error(response.error?.message || 'Failed to fetch terminations');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch terminations';
      setError(errorMessage);
      message.error(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get termination by ID
   * REST API: GET /api/terminations/:id
   */
  const getTerminationById = useCallback(async (terminationId: string): Promise<Termination | null> => {
    try {
      const response: ApiResponse<Termination> = await get(`/terminations/${terminationId}`);

      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error?.message || 'Failed to fetch termination');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch termination';
      message.error(errorMessage);
      return null;
    }
  }, []);

  /**
   * Create new termination
   * REST API: POST /api/terminations
   */
  const createTermination = useCallback(async (terminationData: Partial<Termination>): Promise<boolean> => {
    try {
      const response: ApiResponse<Termination> = await post('/terminations', terminationData);

      if (response.success) {
        message.success('Termination created successfully!');
        return true;
      }
      throw new Error(response.error?.message || 'Failed to create termination');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to create termination';
      message.error(errorMessage);
      return false;
    }
  }, []);

  /**
   * Update termination
   * REST API: PUT /api/terminations/:id
   */
  const updateTermination = useCallback(async (terminationId: string, updateData: Partial<Termination>): Promise<boolean> => {
    try {
      const response: ApiResponse<Termination> = await put(`/terminations/${terminationId}`, updateData);

      if (response.success) {
        message.success('Termination updated successfully!');
        setTerminations(prev =>
          prev.map(termination =>
            termination.terminationId === terminationId ? { ...termination, ...updateData } : termination
          )
        );
        return true;
      }
      throw new Error(response.error?.message || 'Failed to update termination');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to update termination';
      message.error(errorMessage);
      return false;
    }
  }, []);

  /**
   * Delete terminations (bulk delete)
   * REST API: DELETE /api/terminations
   */
  const deleteTerminations = useCallback(async (terminationIds: string[]): Promise<boolean> => {
    try {
      const response: ApiResponse = await del('/terminations', { data: { terminationIds } });

      if (response.success) {
        message.success('Termination(s) deleted successfully!');
        setTerminations(prev => prev.filter(termination => !terminationIds.includes(termination.terminationId)));
        return true;
      }
      throw new Error(response.error?.message || 'Failed to delete termination(s)');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to delete termination(s)';
      message.error(errorMessage);
      return false;
    }
  }, []);

  /**
   * Process termination (mark as complete)
   * REST API: PUT /api/terminations/:id/process
   */
  const processTermination = useCallback(async (terminationId: string): Promise<boolean> => {
    try {
      const response: ApiResponse = await put(`/terminations/${terminationId}/process`);

      if (response.success) {
        message.success('Termination processed successfully!');
        setTerminations(prev =>
          prev.map(termination =>
            termination.terminationId === terminationId
              ? { ...termination, status: 'processed', processedAt: new Date().toISOString() }
              : termination
          )
        );
        return true;
      }
      throw new Error(response.error?.message || 'Failed to process termination');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to process termination';
      message.error(errorMessage);
      return false;
    }
  }, []);

  /**
   * Cancel termination
   * REST API: PUT /api/terminations/:id/cancel
   */
  const cancelTermination = useCallback(async (terminationId: string, reason?: string): Promise<boolean> => {
    try {
      const response: ApiResponse = await put(`/terminations/${terminationId}/cancel`, { reason });

      if (response.success) {
        message.success('Termination cancelled successfully!');
        setTerminations(prev =>
          prev.map(termination =>
            termination.terminationId === terminationId
              ? { ...termination, status: 'cancelled', cancellationReason: reason }
              : termination
          )
        );
        return true;
      }
      throw new Error(response.error?.message || 'Failed to cancel termination');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to cancel termination';
      message.error(errorMessage);
      return false;
    }
  }, []);

  return {
    terminations,
    stats,
    loading,
    error,
    fetchTerminationStats,
    fetchTerminations,
    getTerminationById,
    createTermination,
    updateTermination,
    deleteTerminations,
    processTermination,
    cancelTermination
  };
};

export default useTerminationsREST;
