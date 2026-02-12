import { message } from 'antd';
import { useCallback, useState } from 'react';
import { del, get, post, put } from '../services/api';

export interface AssetUser {
  _id: string;
  assetId: string;
  employeeId: string;
  assignedDate: string;
  returnedDate?: string;
  status: 'assigned' | 'returned' | 'damaged' | 'lost';
  notes?: string;
  // Flattened asset fields from backend lookup
  assetIdDisplay?: string;
  assetName?: string;
  assetSerialNumber?: string;
  assetCategoryName?: string;
  assetStatus?: string;
  assetModel?: string;
  assetPurchaseDate?: string;
  assetWarrantyMonths?: number;
  assetVendorName?: string;
  // Flattened employee fields from backend lookup
  employeeName?: string;
  employeeAvatar?: string;
  employeeIdDisplay?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface FetchAssetUsersParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
  status?: string;
  assetId?: string;
  employeeId?: string;
  startDate?: string;
  endDate?: string;
}

interface AssetUserCreateData {
  assetId: string;
  employeeId: string;
  assignedDate: string;
  notes?: string;
  status?: 'assigned' | 'returned' | 'damaged' | 'lost';
}

interface AssetUserUpdateData {
  assignedDate?: string;
  returnedDate?: string;
  status?: 'assigned' | 'returned' | 'damaged' | 'lost';
  notes?: string;
}

export const useAssetUsersREST = () => {
  const [assetUsers, setAssetUsers] = useState<AssetUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  /**
   * Fetch asset assignments with filters
   */
  const fetchAssetUsers = useCallback(async (params: FetchAssetUsersParams = {}) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();

      if (params.page) queryParams.append('page', params.page.toString());
      if (params.pageSize) queryParams.append('limit', params.pageSize.toString());
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.order) queryParams.append('order', params.order);
      if (params.status) queryParams.append('status', params.status);
      if (params.assetId) queryParams.append('assetId', params.assetId);
      if (params.employeeId) queryParams.append('employeeId', params.employeeId);
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);

      const response = await get(`/asset-users?${queryParams.toString()}`);

      if (response.success) {
        // Handle new response structure: { assetUsers: [...], pagination: {...} }
        setAssetUsers(response.data?.assetUsers || []);
        if (response.data?.pagination) {
          setPagination(response.data.pagination);
        }
      } else {
        setError(response.message || 'Failed to fetch asset assignments');
        message.error(response.message || 'Failed to fetch asset assignments');
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message || err.message || 'Failed to fetch asset assignments';
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get single asset assignment by ID
   */
  const getAssetUserById = useCallback(async (id: string): Promise<AssetUser | null> => {
    try {
      const response = await get(`/asset-users/${id}`);

      if (response.success) {
        return response.data;
      } else {
        message.error(response.message || 'Failed to fetch asset assignment');
        return null;
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to fetch asset assignment');
      return null;
    }
  }, []);

  /**
   * Create new asset assignment
   */
  const createAssetUser = useCallback(async (data: AssetUserCreateData): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await post('/asset-users', data);

      if (response.success) {
        message.success('Asset assigned successfully');
        return true;
      } else {
        message.error(response.message || 'Failed to assign asset');
        return false;
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to assign asset');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update asset assignment
   */
  const updateAssetUser = useCallback(
    async (id: string, data: AssetUserUpdateData): Promise<boolean> => {
      setLoading(true);
      try {
        const response = await put(`/asset-users/${id}`, data);

        if (response.success) {
          message.success('Asset assignment updated successfully');
          return true;
        } else {
          message.error(response.message || 'Failed to update asset assignment');
          return false;
        }
      } catch (err: any) {
        message.error(err.response?.data?.message || 'Failed to update asset assignment');
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Delete asset assignment
   */
  const deleteAssetUser = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await del(`/asset-users/${id}`);

      if (response.success) {
        message.success('Asset assignment deleted successfully');
        return true;
      } else {
        message.error(response.message || 'Failed to delete asset assignment');
        return false;
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to delete asset assignment');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get asset assignment history for a specific asset
   */
  const getAssetHistory = useCallback(async (assetId: string): Promise<AssetUser[]> => {
    try {
      const response = await get(`/asset-users/asset/${assetId}/history`);

      if (response.success) {
        return response.data || [];
      } else {
        message.error(response.message || 'Failed to fetch asset history');
        return [];
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to fetch asset history');
      return [];
    }
  }, []);

  /**
   * Get all assets assigned to a specific employee
   */
  const getEmployeeAssets = useCallback(async (employeeId: string): Promise<AssetUser[]> => {
    try {
      const response = await get(`/asset-users/employee/${employeeId}`);

      if (response.success) {
        return response.data || [];
      } else {
        message.error(response.message || 'Failed to fetch employee assets');
        return [];
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to fetch employee assets');
      return [];
    }
  }, []);

  return {
    assetUsers,
    loading,
    error,
    pagination,
    fetchAssetUsers,
    getAssetUserById,
    createAssetUser,
    updateAssetUser,
    deleteAssetUser,
    getAssetHistory,
    getEmployeeAssets,
  };
};
