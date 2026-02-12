import { message } from 'antd';
import { useCallback, useState } from 'react';
import { del, get, post, put } from '../services/api';

export interface Asset {
  _id: string;
  assetId?: string; // Generated unique asset ID (e.g., AST-2026-0001)
  name: string;
  category?: string;
  categoryName?: string;
  serialNumber?: string;
  model?: string;
  vendor?: {
    name?: string;
  };
  purchaseDate?: string;
  purchaseValue?: number;
  warrantyMonths?: number;
  warranty?: {
    expiryDate?: string;
  };
  status: string;
  assigned?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface FetchAssetsParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
  status?: string;
  category?: string;
  search?: string;
}

interface AssetCreateData {
  name: string;
  category: string;
  serialNumber?: string;
  model?: string;
  vendor?: {
    name?: string;
  };
  purchaseDate: string;
  purchaseValue: number;
  warrantyMonths?: number;
  status: string;
  assignedTo?: string;
}

interface AssetUpdateData {
  name?: string;
  category?: string;
  serialNumber?: string;
  model?: string;
  vendor?: {
    name?: string;
  };
  purchaseDate?: string;
  purchaseValue?: number;
  warrantyMonths?: number;
  status?: string;
  assignedTo?: string;
}

export const useAssetsREST = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  /**
   * Fetch assets with filters
   */
  const fetchAssets = useCallback(async (params: FetchAssetsParams = {}) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();

      if (params.page) queryParams.append('page', params.page.toString());
      if (params.pageSize) queryParams.append('limit', params.pageSize.toString());
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.order) queryParams.append('order', params.order);
      if (params.status) queryParams.append('status', params.status);
      if (params.category) queryParams.append('category', params.category);
      if (params.search) queryParams.append('search', params.search);

      const response = await get(`/assets?${queryParams.toString()}`);

      console.log('[useAssetsREST] Fetch response:', response);

      if (response.success) {
        console.log('[useAssetsREST] Setting assets:', response.data?.length || 0, 'items');
        setAssets(response.data || []);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else {
        setError(response.message || 'Failed to fetch assets');
        message.error(response.message || 'Failed to fetch assets');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch assets';
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get single asset by ID
   */
  const getAssetById = useCallback(async (id: string): Promise<Asset | null> => {
    try {
      const response = await get(`/assets/${id}`);

      if (response.success) {
        return response.data;
      } else {
        message.error(response.message || 'Failed to fetch asset');
        return null;
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to fetch asset');
      return null;
    }
  }, []);

  /**
   * Create new asset
   */
  const createAsset = useCallback(async (data: AssetCreateData): Promise<boolean> => {
    setLoading(true);

    try {
      console.log('[useAssetsREST] Creating asset:', data);
      const response = await post('/assets', data);

      console.log('[useAssetsREST] Create response:', response);

      if (response.success) {
        message.success('Asset created successfully!');
        return true;
      } else {
        message.error(response.message || 'Failed to create asset');
        return false;
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to create asset');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update asset
   */
  const updateAsset = useCallback(async (id: string, data: AssetUpdateData): Promise<boolean> => {
    setLoading(true);

    try {
      const response = await put(`/assets/${id}`, data);

      if (response.success) {
        message.success('Asset updated successfully!');

        // Update local state
        setAssets((prev) =>
          prev.map((asset) => (asset._id === id ? { ...asset, ...data } : asset))
        );

        return true;
      } else {
        message.error(response.message || 'Failed to update asset');
        return false;
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to update asset');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Delete asset
   */
  const deleteAsset = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);

    try {
      const response = await del(`/assets/${id}`);

      if (response.success) {
        message.success('Asset deleted successfully!');

        // Remove from local state
        setAssets((prev) => prev.filter((asset) => asset._id !== id));

        return true;
      } else {
        message.error(response.message || 'Failed to delete asset');
        return false;
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to delete asset');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    assets,
    loading,
    error,
    pagination,
    fetchAssets,
    getAssetById,
    createAsset,
    updateAsset,
    deleteAsset,
  };
};
