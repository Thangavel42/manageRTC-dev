/**
 * Batches REST API Hook
 * Handles batch management operations
 */

import { message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { ApiResponse, buildParams, del, get, post, put } from '../services/api';
import { useSocket } from '../SocketContext';

export interface Batch {
  _id: string;
  batchId?: string;
  name: string;
  code?: string;
  description?: string;
  companyId: string;
  shiftId: string;
  shiftName?: string;
  shiftCode?: string;
  shiftTiming?: string;
  shiftColor?: string;
  shiftEffectiveFrom: string;
  rotationEnabled: boolean;
  rotationPattern?: {
    mode: 'cyclic' | 'sequential';
    shiftSequence: string[];
    daysPerShift: number;
    startDate: string;
    currentIndex: number;
  };
  capacity?: number;
  departmentId?: string;
  departmentName?: string;
  color: string;
  isActive: boolean;
  isDefault: boolean;
  isDeleted: boolean;
  employeeCount?: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface BatchFilters {
  departmentId?: string;
  includeEmployeeCount?: boolean;
  search?: string;
  isActive?: boolean;
}

export interface CreateBatchRequest {
  name: string;
  code?: string;
  description?: string;
  shiftId: string;
  rotationEnabled?: boolean;
  rotationPattern?: {
    mode?: 'cyclic' | 'sequential';
    shiftSequence: string[];
    daysPerShift: number;
    startDate?: string;
    currentIndex?: number;
  };
  capacity?: number;
  departmentId?: string;
  color?: string;
}

export interface BatchScheduleItem {
  startDate: string;
  endDate: string;
  isRotation: boolean;
  shiftIndex: number;
  shift: {
    _id: string;
    name: string;
    code?: string;
    startTime: string;
    endTime: string;
    color: string;
  };
}

export interface BatchHistoryItem {
  _id: string;
  shiftId: string;
  shiftName?: string;
  shiftCode?: string;
  shiftTiming?: string;
  shiftColor?: string;
  effectiveStartDate: string;
  effectiveEndDate?: string | null;
  assignedBy?: string;
  reason?: string;
  changeType: 'initial' | 'rotation' | 'manual' | 'batch_created' | 'batch_deleted';
  rotationSnapshot?: any;
}

export interface BatchEmployeesResponse {
  employees: Array<{
    _id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone?: string;
    departmentId?: string;
    departmentName?: string;
    designationId?: string;
    workLocation?: string;
    employmentStatus?: string;
    profileImage?: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * Batches REST API Hook
 */
export const useBatchesREST = () => {
  const socket = useSocket();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [defaultBatch, setDefaultBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all batches
   * REST API: GET /api/batches
   */
  const fetchBatches = useCallback(async (filters: BatchFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildParams(filters);
      const response: ApiResponse<Batch[]> = await get('/batches', { params });

      if (response.success && response.data) {
        setBatches(response.data);
        return response.data;
      }
      throw new Error(response.error?.message || 'Failed to fetch batches');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch batches';
      setError(errorMessage);
      message.error(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get single batch by ID
   * REST API: GET /api/batches/:id
   */
  const getBatchById = useCallback(async (batchId: string): Promise<Batch | null> => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<Batch> = await get(`/batches/${batchId}`);

      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error?.message || 'Failed to fetch batch');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch batch';
      setError(errorMessage);
      message.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get default batch for company
   * REST API: GET /api/batches/default
   */
  const fetchDefaultBatch = useCallback(async () => {
    try {
      const response: ApiResponse<Batch> = await get('/batches/default');

      if (response.success && response.data) {
        setDefaultBatch(response.data);
        return response.data;
      }
      return null;
    } catch (err: any) {
      // Silently handle 404 - it's expected when there's no default batch
      if (err?.response?.status === 404) {
        setDefaultBatch(null);
        return null;
      }
      console.error('[useBatchesREST] Failed to fetch default batch:', err);
      return null;
    }
  }, []);

  /**
   * Create new batch
   * REST API: POST /api/batches
   */
  const createBatch = useCallback(async (
    batchData: CreateBatchRequest
  ): Promise<{ success: boolean; batch?: Batch; error?: any }> => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<Batch> = await post('/batches', batchData);

      if (response.success && response.data) {
        message.success('Batch created successfully!');
        await fetchBatches();
        return { success: true, batch: response.data };
      }
      throw new Error(response.error?.message || 'Failed to create batch');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to create batch';
      setError(errorMessage);
      message.error(errorMessage);
      return {
        success: false,
        error: {
          ...err.response?.data?.error,
          message: errorMessage
        }
      };
    } finally {
      setLoading(false);
    }
  }, [fetchBatches]);

  /**
   * Update batch
   * REST API: PUT /api/batches/:id
   */
  const updateBatch = useCallback(async (
    batchId: string,
    updateData: Partial<CreateBatchRequest>
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<Batch> = await put(`/batches/${batchId}`, updateData);

      if (response.success && response.data) {
        message.success('Batch updated successfully!');
        await fetchBatches();
        return true;
      }
      throw new Error(response.error?.message || 'Failed to update batch');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to update batch';
      setError(errorMessage);
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchBatches]);

  /**
   * Delete batch
   * REST API: DELETE /api/batches/:id
   */
  const deleteBatch = useCallback(async (batchId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse = await del(`/batches/${batchId}`);

      if (response.success) {
        message.success('Batch deleted successfully!');
        await fetchBatches();
        await fetchDefaultBatch();
        return true;
      }
      throw new Error(response.error?.message || 'Failed to delete batch');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to delete batch';
      setError(errorMessage);
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchBatches, fetchDefaultBatch]);

  /**
   * Set batch as default
   * REST API: POST /api/batches/:id/set-default
   */
  const setAsDefault = useCallback(async (batchId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<Batch> = await post(`/batches/${batchId}/set-default`, {});

      if (response.success) {
        message.success('Default batch updated successfully!');
        await fetchBatches();
        await fetchDefaultBatch();
        return true;
      }
      throw new Error(response.error?.message || 'Failed to set default batch');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to set default batch';
      setError(errorMessage);
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchBatches, fetchDefaultBatch]);

  /**
   * Get employees in a batch
   * REST API: GET /api/batches/:id/employees
   */
  const getBatchEmployees = useCallback(async (
    batchId: string,
    page = 1,
    limit = 50,
    search?: string
  ): Promise<BatchEmployeesResponse | null> => {
    try {
      const params = buildParams({ page, limit, search });
      const response: ApiResponse<BatchEmployeesResponse> = await get(`/batches/${batchId}/employees`, { params });

      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch batch employees';
      message.error(errorMessage);
      return null;
    }
  }, []);

  /**
   * Get batch rotation schedule
   * REST API: GET /api/batches/:id/schedule
   */
  const getBatchSchedule = useCallback(async (
    batchId: string,
    startDate?: string,
    endDate?: string,
    months = 3
  ): Promise<{ schedule: BatchScheduleItem[]; nextRotationDate?: string } | null> => {
    try {
      const params = buildParams({ startDate, endDate, months });
      const response: ApiResponse<any> = await get(`/batches/${batchId}/schedule`, { params });

      if (response.success && response.data) {
        return {
          schedule: response.data.schedule || [],
          nextRotationDate: response.data.nextRotationDate
        };
      }
      return null;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch batch schedule';
      message.error(errorMessage);
      return null;
    }
  }, []);

  /**
   * Get batch assignment history
   * REST API: GET /api/batches/:id/history
   */
  const getBatchHistory = useCallback(async (
    batchId: string,
    limit = 20
  ): Promise<BatchHistoryItem[] | null> => {
    try {
      const params = buildParams({ limit });
      const response: ApiResponse<BatchHistoryItem[]> = await get(`/batches/${batchId}/history`, { params });

      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch batch history';
      message.error(errorMessage);
      return null;
    }
  }, []);

  /**
   * Assign employees to batch
   * REST API: POST /api/employees/batch-assign
   */
  const assignEmployeesToBatch = useCallback(async (
    employeeIds: string[],
    batchId: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse = await post('/employees/batch-assign', {
        employeeIds,
        batchId
      });

      if (response.success) {
        message.success(`Successfully assigned ${employeeIds.length} employee(s) to batch!`);
        return true;
      }
      throw new Error(response.error?.message || 'Failed to assign employees to batch');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to assign employees to batch';
      setError(errorMessage);
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Remove employee from batch
   * REST API: DELETE /api/employees/:id/batch
   */
  const removeEmployeeFromBatch = useCallback(async (
    employeeId: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse = await del(`/employees/${employeeId}/batch`);

      if (response.success) {
        message.success('Employee removed from batch successfully!');
        return true;
      }
      throw new Error(response.error?.message || 'Failed to remove employee from batch');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to remove employee from batch';
      setError(errorMessage);
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Transfer employees between batches
   * REST API: POST /api/employees/batch-transfer
   */
  const transferEmployeesBetweenBatches = useCallback(async (
    employeeIds: string[],
    fromBatchId: string,
    toBatchId: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse = await post('/employees/batch-transfer', {
        employeeIds,
        fromBatchId,
        toBatchId
      });

      if (response.success) {
        message.success(`Successfully transferred ${employeeIds.length} employee(s)!`);
        return true;
      }
      throw new Error(response.error?.message || 'Failed to transfer employees');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to transfer employees';
      setError(errorMessage);
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Socket.IO real-time listeners for broadcast notifications
  useEffect(() => {
    if (!socket) return;

    const handleBatchCreated = (data: any) => {
      console.log('[useBatchesREST] Batch created via broadcast:', data);
      fetchBatches();
    };

    const handleBatchUpdated = (data: any) => {
      console.log('[useBatchesREST] Batch updated via broadcast:', data);
      setBatches(prev =>
        prev.map(batch => (batch._id === data._id ? { ...batch, ...data } : batch))
      );
    };

    const handleBatchDeleted = (data: any) => {
      console.log('[useBatchesREST] Batch deleted via broadcast:', data);
      setBatches(prev => prev.filter(batch => batch._id !== data._id));
    };

    const handleDefaultBatchChanged = (data: any) => {
      console.log('[useBatchesREST] Default batch changed via broadcast:', data);
      fetchBatches();
      fetchDefaultBatch();
    };

    socket.on('batch:created', handleBatchCreated);
    socket.on('batch:updated', handleBatchUpdated);
    socket.on('batch:deleted', handleBatchDeleted);
    socket.on('batch:default_changed', handleDefaultBatchChanged);

    return () => {
      socket.off('batch:created', handleBatchCreated);
      socket.off('batch:updated', handleBatchUpdated);
      socket.off('batch:deleted', handleBatchDeleted);
      socket.off('batch:default_changed', handleDefaultBatchChanged);
    };
  }, [socket, fetchBatches, fetchDefaultBatch]);

  // Initial data fetch
  useEffect(() => {
    fetchBatches();
    // Note: fetchDefaultBatch() is available but not called by default
    // Call it explicitly when needed, as the backend endpoint may not exist
    // fetchDefaultBatch();
  }, [fetchBatches]);

  return {
    batches,
    defaultBatch,
    loading,
    error,
    fetchBatches,
    getBatchById,
    fetchDefaultBatch,
    createBatch,
    updateBatch,
    deleteBatch,
    setAsDefault,
    getBatchEmployees,
    getBatchSchedule,
    getBatchHistory,
    assignEmployeesToBatch,
    removeEmployeeFromBatch,
    transferEmployeesBetweenBatches
  };
};

export default useBatchesREST;
