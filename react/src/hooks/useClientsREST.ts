/**
 * Clients REST API Hook
 * Pure REST API hook - no Socket.IO dependency
 */

import { message } from 'antd';
import { useCallback, useState } from 'react';
import { ApiResponse, del, get, getAuthToken, post, put } from '../services/api';

export interface Client {
  _id: string;
  clientId?: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  logo?: string;
  status: 'Active' | 'Inactive' | 'Lead';
  tier?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  type?: 'Enterprise' | 'SMB' | 'Startup';
  accountManager?: string;
  contractValue?: number;
  projects?: number;
  notes?: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    whatsapp?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ClientStats {
  total: number;
  totalClients: number;
  activeClients: number;
  inactiveClients: number;
  newClients: number;
}

export interface ClientFilters {
  page?: number;
  limit?: number;
  status?: string;
  tier?: string;
  type?: string;
  accountManager?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isDeleted?: boolean;
}

/**
 * Clients REST API Hook
 * Uses REST APIs for all CRUD operations and exports
 */
export const useClientsREST = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all clients with optional filters
   * REST API: GET /api/clients
   */
  const fetchClients = useCallback(async (filters: ClientFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      // Backend automatically filters isDeleted = false
      // Just send empty params to get all non-deleted clients
      const response: ApiResponse<Client[]> = await get('/clients');

      if (response.success && response.data) {
        setClients(response.data);
        if (response.pagination) {
          console.log('[useClientsREST] Pagination:', response.pagination);
        }
      } else {
        throw new Error(response.error?.message || 'Failed to fetch clients');
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message || err.message || 'Failed to fetch clients';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch client statistics
   * REST API: GET /api/clients/stats
   */
  const fetchStats = useCallback(async () => {
    try {
      const response: ApiResponse<ClientStats> = await get('/clients/stats');

      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err: any) {
      console.error('[useClientsREST] Failed to fetch stats:', err);
    }
  }, []);

  /**
   * Fetch clients by account manager
   * REST API: GET /api/clients/account/:managerId
   */
  const fetchByAccountManager = useCallback(async (managerId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<Client[]> = await get(`/clients/account/${managerId}`);

      if (response.success && response.data) {
        setClients(response.data);
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message || err.message || 'Failed to fetch clients';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch clients by tier
   * REST API: GET /api/clients/tier/:tier
   */
  const fetchByTier = useCallback(async (tier: string) => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<Client[]> = await get(`/clients/tier/${tier}`);

      if (response.success && response.data) {
        setClients(response.data);
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message || err.message || 'Failed to fetch clients';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get client by ID
   * REST API: GET /api/clients/:id
   */
  const getClientById = useCallback(async (clientId: string): Promise<Client | null> => {
    try {
      const response: ApiResponse<Client> = await get(`/clients/${clientId}`);

      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error?.message || 'Failed to fetch client');
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message || err.message || 'Failed to fetch client';
      message.error(errorMessage);
      return null;
    }
  }, []);

  /**
   * Create new client
   * REST API: POST /api/clients
   */
  const createClient = useCallback(
    async (clientData: Partial<Client>): Promise<boolean> => {
      try {
        const response: ApiResponse<Client> = await post('/clients', clientData);

        if (response.success && response.data) {
          message.success('Client created successfully!');
          // Refresh the full list to stay in sync
          await fetchClients();
          await fetchStats();
          return true;
        }
        throw new Error(response.error?.message || 'Failed to create client');
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.error?.message || err.message || 'Failed to create client';
        message.error(errorMessage);
        return false;
      }
    },
    [fetchClients, fetchStats]
  );

  /**
   * Update client
   * REST API: PUT /api/clients/:id
   */
  const updateClient = useCallback(
    async (clientId: string, updateData: Partial<Client>): Promise<boolean> => {
      try {
        console.log('[useClientsREST] updateClient - clientId:', clientId);
        console.log(
          '[useClientsREST] updateClient - updateData:',
          JSON.stringify(updateData, null, 2)
        );
        console.log('[useClientsREST] updateClient - socialLinks:', updateData.socialLinks);

        const response: ApiResponse<Client> = await put(`/clients/${clientId}`, updateData);

        if (response.success && response.data) {
          message.success('Client updated successfully!');
          // Refresh the full list to stay in sync
          await fetchClients();
          await fetchStats();
          return true;
        }
        throw new Error(response.error?.message || 'Failed to update client');
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.error?.message || err.message || 'Failed to update client';
        message.error(errorMessage);
        return false;
      }
    },
    [fetchClients, fetchStats]
  );

  /**
   * Delete client
   * REST API: DELETE /api/clients/:id
   */
  const deleteClient = useCallback(
    async (clientId: string): Promise<boolean> => {
      try {
        const response: ApiResponse = await del(`/clients/${clientId}`);

        if (response.success) {
          message.success('Client deleted successfully!');
          // Refresh the full list to stay in sync
          await fetchClients();
          await fetchStats();
          return true;
        }
        throw new Error(response.error?.message || 'Failed to delete client');
      } catch (err: any) {
        // Re-throw the error so the component can handle it with a modal
        throw err;
      }
    },
    [fetchClients, fetchStats]
  );

  /**
   * Update client tier
   * REST API: PUT /api/clients/:id/tier
   */
  const updateClientTier = useCallback(async (clientId: string, tier: string): Promise<boolean> => {
    try {
      const response: ApiResponse<Client> = await put(`/clients/${clientId}/tier`, { tier });

      if (response.success && response.data) {
        message.success(`Client tier updated to ${tier}`);
        setClients((prev) =>
          prev.map((client) =>
            client._id === clientId ? { ...client, ...response.data! } : client
          )
        );
        return true;
      }
      throw new Error(response.error?.message || 'Failed to update client tier');
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message || err.message || 'Failed to update client tier';
      message.error(errorMessage);
      return false;
    }
  }, []);

  /**
   * Search clients
   * REST API: GET /api/clients (with search parameter)
   */
  const searchClients = useCallback(
    async (searchTerm: string) => {
      return fetchClients({ search: searchTerm });
    },
    [fetchClients]
  );

  /**
   * Filter clients
   * REST API: GET /api/clients (with filter parameters)
   */
  const filterClients = useCallback(
    (filters: ClientFilters) => {
      return fetchClients(filters);
    },
    [fetchClients]
  );

  /**
   * Export clients as PDF
   * REST API: GET /api/clients/export/pdf
   */
  const exportPDF = useCallback(async () => {
    setExporting(true);
    try {
      // Get API base URL from environment
      const apiBaseUrl =
        process.env.REACT_APP_API_URL ||
        process.env.REACT_APP_BACKEND_URL ||
        'http://localhost:5000';

      // Get the auth token from the cached token
      const token = getAuthToken();

      // Make request to download PDF file directly
      const response = await fetch(`${apiBaseUrl}/api/clients/export/pdf`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export PDF');
      }

      // Get the blob from response
      const blob = await response.blob();

      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);

      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `clients_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the temporary URL
      window.URL.revokeObjectURL(url);

      message.success('PDF exported successfully!');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to export PDF';
      message.error(errorMessage);
    } finally {
      setExporting(false);
    }
  }, []);

  /**
   * Export clients as Excel
   * REST API: GET /api/clients/export/excel
   */
  const exportExcel = useCallback(async () => {
    setExporting(true);
    try {
      // Get API base URL from environment
      const apiBaseUrl =
        process.env.REACT_APP_API_URL ||
        process.env.REACT_APP_BACKEND_URL ||
        'http://localhost:5000';

      // Get the auth token from the cached token
      const token = getAuthToken();

      // Make request to download Excel file directly
      const response = await fetch(`${apiBaseUrl}/api/clients/export/excel`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export Excel');
      }

      // Get the blob from response
      const blob = await response.blob();

      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);

      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `clients_${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the temporary URL
      window.URL.revokeObjectURL(url);

      message.success('Excel exported successfully!');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to export Excel';
      message.error(errorMessage);
    } finally {
      setExporting(false);
    }
  }, []);

  return {
    clients,
    stats,
    loading,
    exporting,
    error,
    fetchClients,
    fetchStats,
    fetchByAccountManager,
    fetchByTier,
    getClientById,
    createClient,
    updateClient,
    deleteClient,
    updateClientTier,
    searchClients,
    filterClients,
    exportPDF,
    exportExcel,
  };
};

export default useClientsREST;
