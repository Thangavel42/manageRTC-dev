/**
 * Asset Category REST API Hook
 * Provides CRUD operations for asset categories
 */

import { message } from 'antd';
import { useCallback, useState } from 'react';
import { del as apiDel, get as apiGet, post as apiPost, put as apiPut } from '../services/api';

export interface AssetCategory {
  _id: string;
  name: string;
  status: string;
  assetsCount?: number;
  createdAt: string;
  updatedAt?: string;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any[];
  };
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export const useAssetCategoriesREST = () => {
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);

  /**
   * Fetch all asset categories
   */
  const fetchCategories = useCallback(
    async (
      params: {
        page?: number;
        pageSize?: number;
        sortBy?: string;
        status?: string;
        search?: string;
      } = {}
    ): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const response: ApiResponse<{
          categories: AssetCategory[];
          pagination: PaginationInfo;
        }> = await apiGet('/asset-categories', { params });

        if (response.success && response.data) {
          setCategories(response.data.categories);
          setPagination(response.data.pagination);
          return true;
        }
        throw new Error(response.error?.message || 'Failed to fetch categories');
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.error?.message || err.message || 'Failed to fetch categories';
        setError(errorMessage);
        message.error(errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Get single category by ID
   */
  const getCategoryById = useCallback(async (id: string): Promise<AssetCategory | null> => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<AssetCategory> = await apiGet(`/asset-categories/${id}`);

      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error?.message || 'Failed to fetch category');
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message || err.message || 'Failed to fetch category';
      setError(errorMessage);
      message.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create new asset category
   */
  const createCategory = useCallback(
    async (data: { name: string; status?: string }): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const response: ApiResponse<AssetCategory> = await apiPost('/asset-categories', data);

        if (response.success && response.data) {
          message.success('Category created successfully!');
          setCategories((prev) => [response.data!, ...prev]);
          return true;
        }
        throw new Error(response.error?.message || 'Failed to create category');
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.error?.message || err.message || 'Failed to create category';
        setError(errorMessage);
        message.error(errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Update asset category
   */
  const updateCategory = useCallback(
    async (id: string, data: { name?: string; status?: string }): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const response: ApiResponse<AssetCategory> = await apiPut(`/asset-categories/${id}`, data);

        if (response.success && response.data) {
          message.success('Category updated successfully!');
          setCategories((prev) => prev.map((cat) => (cat._id === id ? response.data! : cat)));
          return true;
        }
        throw new Error(response.error?.message || 'Failed to update category');
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.error?.message || err.message || 'Failed to update category';
        setError(errorMessage);
        message.error(errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Delete asset category
   */
  const deleteCategory = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse = await apiDel(`/asset-categories/${id}`);

      if (response.success) {
        message.success('Category deleted successfully!');
        setCategories((prev) => prev.filter((cat) => cat._id !== id));
        return true;
      }
      throw new Error(response.error?.message || 'Failed to delete category');
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message || err.message || 'Failed to delete category';
      setError(errorMessage);
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    categories,
    loading,
    error,
    pagination,
    fetchCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
  };
};
