/**
 * Resignations REST API Hook
 * Replaces Socket.IO-based resignation operations with REST API calls
 * Real-time updates still use Socket.IO listeners
 */

import { message } from 'antd';
import { useCallback, useState } from 'react';
import { ApiResponse, buildParams, del, get, post, put } from '../services/api';

export interface Resignation {
  _id?: string;
  resignationId: string;
  employeeId: string;
  employeeName?: string;
  employee_id?: string;
  employeeImage?: string;
  department?: string;
  departmentId?: string;
  designation?: string;
  resignationDate: string;
  noticeDate: string;
  reason: string;
  status: string;
  resignationStatus?: 'pending' | 'on_notice' | 'rejected' | 'resigned' | 'withdrawn';
  reportingManagerId?: string;
  reportingManagerName?: string;
  effectiveDate?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  processedAt?: string;
  created_at?: string;
  notes?: string;
}

export interface ResignationStats {
  totalResignations: string;
  recentResignations: string;
  pending?: number;
  onNotice?: number;
  resigned?: number;
}

export interface ResignationFilters {
  type?: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thismonth' | 'lastmonth' | 'thisyear' | 'alltime';
  startDate?: string;
  endDate?: string;
}

/**
 * Resignations REST API Hook
 */
export const useResignationsREST = () => {
  const [resignations, setResignations] = useState<Resignation[]>([]);
  const [stats, setStats] = useState<ResignationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch resignation statistics
   * REST API: GET /api/resignations/stats
   */
  const fetchResignationStats = useCallback(async () => {
    try {
      const response: ApiResponse<ResignationStats> = await get('/resignations/stats');

      if (response.success && response.data) {
        setStats(response.data);
        return response.data;
      }
      throw new Error(response.error?.message || 'Failed to fetch resignation stats');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch resignation stats';
      console.error(errorMessage);
      return null;
    }
  }, []);

  /**
   * Fetch all resignations with optional filters
   * REST API: GET /api/resignations
   */
  const fetchResignations = useCallback(async (filters: ResignationFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildParams(filters);
      const response: ApiResponse<Resignation[]> = await get('/resignations', { params });

      if (response.success && response.data) {
        setResignations(response.data);
        return response.data;
      } else {
        throw new Error(response.error?.message || 'Failed to fetch resignations');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch resignations';
      setError(errorMessage);
      message.error(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get resignation by ID
   * REST API: GET /api/resignations/:id
   */
  const getResignationById = useCallback(async (resignationId: string): Promise<Resignation | null> => {
    try {
      const response: ApiResponse<Resignation> = await get(`/resignations/${resignationId}`);

      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error?.message || 'Failed to fetch resignation');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch resignation';
      message.error(errorMessage);
      return null;
    }
  }, []);

  /**
   * Create new resignation
   * REST API: POST /api/resignations
   */
  const createResignation = useCallback(async (resignationData: Partial<Resignation>): Promise<boolean> => {
    try {
      const response: ApiResponse<Resignation> = await post('/resignations', resignationData);

      if (response.success) {
        message.success('Resignation created successfully!');
        return true;
      }
      throw new Error(response.error?.message || 'Failed to create resignation');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to create resignation';
      message.error(errorMessage);
      return false;
    }
  }, []);

  /**
   * Update resignation
   * REST API: PUT /api/resignations/:id
   */
  const updateResignation = useCallback(async (resignationId: string, updateData: Partial<Resignation>): Promise<boolean> => {
    try {
      const response: ApiResponse<Resignation> = await put(`/resignations/${resignationId}`, updateData);

      if (response.success) {
        message.success('Resignation updated successfully!');
        setResignations(prev =>
          prev.map(resignation =>
            resignation.resignationId === resignationId ? { ...resignation, ...updateData } : resignation
          )
        );
        return true;
      }
      throw new Error(response.error?.message || 'Failed to update resignation');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to update resignation';
      message.error(errorMessage);
      return false;
    }
  }, []);

  /**
   * Delete resignations (bulk delete)
   * REST API: DELETE /api/resignations
   */
  const deleteResignations = useCallback(async (resignationIds: string[]): Promise<boolean> => {
    try {
      const response: ApiResponse = await del('/resignations', { data: { resignationIds } });

      if (response.success) {
        message.success('Resignation(s) deleted successfully!');
        setResignations(prev => prev.filter(resignation => !resignationIds.includes(resignation.resignationId)));
        return true;
      }
      throw new Error(response.error?.message || 'Failed to delete resignation(s)');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to delete resignation(s)';
      message.error(errorMessage);
      return false;
    }
  }, []);

  /**
   * Approve resignation
   * REST API: PUT /api/resignations/:id/approve
   */
  const approveResignation = useCallback(async (resignationId: string): Promise<boolean> => {
    try {
      const response: ApiResponse = await put(`/resignations/${resignationId}/approve`);

      if (response.success) {
        message.success('Resignation approved successfully!');
        setResignations(prev =>
          prev.map(resignation =>
            resignation.resignationId === resignationId
              ? { ...resignation, resignationStatus: 'on_notice', status: 'on_notice' }
              : resignation
          )
        );
        return true;
      }
      throw new Error(response.error?.message || 'Failed to approve resignation');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to approve resignation';
      message.error(errorMessage);
      return false;
    }
  }, []);

  /**
   * Reject resignation
   * REST API: PUT /api/resignations/:id/reject
   */
  const rejectResignation = useCallback(async (resignationId: string, reason?: string): Promise<boolean> => {
    try {
      const response: ApiResponse = await put(`/resignations/${resignationId}/reject`, { reason });

      if (response.success) {
        message.success('Resignation rejected successfully!');
        setResignations(prev =>
          prev.map(resignation =>
            resignation.resignationId === resignationId
              ? { ...resignation, resignationStatus: 'rejected', status: 'rejected', rejectionReason: reason }
              : resignation
          )
        );
        return true;
      }
      throw new Error(response.error?.message || 'Failed to reject resignation');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to reject resignation';
      message.error(errorMessage);
      return false;
    }
  }, []);

  /**
   * Process resignation (mark as effective)
   * REST API: PUT /api/resignations/:id/process
   */
  const processResignation = useCallback(async (resignationId: string): Promise<boolean> => {
    try {
      const response: ApiResponse = await put(`/resignations/${resignationId}/process`);

      if (response.success) {
        message.success('Resignation processed successfully!');
        setResignations(prev =>
          prev.map(resignation =>
            resignation.resignationId === resignationId
              ? { ...resignation, processedAt: new Date().toISOString(), resignationStatus: 'resigned', status: 'resigned' }
              : resignation
          )
        );
        return true;
      }
      throw new Error(response.error?.message || 'Failed to process resignation');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to process resignation';
      message.error(errorMessage);
      return false;
    }
  }, []);

  /**
   * Get departments for filter
   * REST API: GET /api/resignations/departments
   */
  const fetchDepartments = useCallback(async () => {
    try {
      const response: ApiResponse = await get('/resignations/departments');

      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (err: any) {
      console.error('Error fetching departments:', err);
      return [];
    }
  }, []);

  /**
   * Get employees by department
   * REST API: GET /api/resignations/employees/:departmentId
   */
  const fetchEmployeesByDepartment = useCallback(async (departmentId: string) => {
    try {
      const response: ApiResponse = await get(`/resignations/employees/${departmentId}`);

      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (err: any) {
      console.error('Error fetching employees:', err);
      return [];
    }
  }, []);

  return {
    resignations,
    stats,
    loading,
    error,
    fetchResignationStats,
    fetchResignations,
    getResignationById,
    createResignation,
    updateResignation,
    deleteResignations,
    approveResignation,
    rejectResignation,
    processResignation,
    fetchDepartments,
    fetchEmployeesByDepartment
  };
};

export default useResignationsREST;
