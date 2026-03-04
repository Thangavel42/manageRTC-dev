/**
 * useSuperadminCompaniesREST Hook
 *
 * React hook for superadmin company management via REST API
 * Replaces socket.io based communication with REST endpoints
 */

import { useAuth } from '@clerk/clerk-react';
import { useCallback, useState } from 'react';

// API base URL
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

// Type definitions
export interface Package {
  id: string;
  plan_name: string;
  plan_type: string;
  currency: string;
}

export interface Company {
  _id: string;
  id: string;
  CompanyName: string;
  Email: string;
  AccountURL: string;
  Plan: string;
  CreatedDate: string;
  Status: 'Active' | 'Inactive';
  Image?: string;
  created_at: string;
  logo?: string;
  name: string;
  email: string;
  domain: string;
  phone: string;
  website: string;
  address: string;
  plan_name: string;
  plan_type: string;
  currency: string;
  plan_id: string;
  status: string;
}

export interface CompanyStats {
  total_companies: number;
  active_companies: number;
  inactive_companies: number;
  location: any;
}

export interface StructuredAddress {
  street?: string;
  street2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface ContactPerson {
  name?: string;
  email?: string;
  phone?: string;
  designation?: string;
}

export interface SocialLinks {
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
}

export interface BillingAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface AdminDetails {
  name?: string;
  email?: string;
  phone?: string;
  profileImage?: string;
  memberSince?: string;
}

export interface CompanyDetails {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  status: string;
  domain: string;
  phone: string;
  phone2?: string | null;
  fax?: string | null;
  website: string;
  description?: string;
  currency: string;
  address: string;
  structuredAddress?: StructuredAddress | null;
  plan_type: string;
  plan_name: string;
  plan_id?: string;
  expiredate?: string;
  price?: string;
  registerdate?: string;
  logo: string;
  // Registration & Legal
  registrationNumber?: string | null;
  taxId?: string | null;
  taxIdType?: string | null;
  legalName?: string | null;
  legalEntityType?: string | null;
  incorporationCountry?: string | null;
  // Industry & Classification
  industry?: string | null;
  subIndustry?: string | null;
  companySize?: string | null;
  companyType?: string | null;
  // Contact & Founder
  contactPerson?: ContactPerson | null;
  founderName?: string | null;
  // Social Links
  social?: SocialLinks | null;
  // Billing
  billingEmail?: string | null;
  billingAddress?: BillingAddress | null;
  // Admin & System
  adminDetails?: AdminDetails | null;
  userCount?: number;
  isActive?: boolean;
  clerkUserId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface _ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface UseSuperadminCompaniesReturn {
  // Data
  packages: Package[];
  companies: Company[];
  stats: CompanyStats | null;
  companyDetails: CompanyDetails | null;

  // Loading states
  packagesLoading: boolean;
  companiesLoading: boolean;
  statsLoading: boolean;
  detailsLoading: boolean;
  editDetailsLoading: boolean;

  // Error states
  error: string | null;

  // Actions
  fetchPackages: () => Promise<Package[] | null>;
  fetchCompanies: (filters?: { status?: string; startDate?: string; endDate?: string }) => Promise<Company[] | null>;
  fetchStats: () => Promise<CompanyStats | null>;
  viewCompany: (id: string) => Promise<CompanyDetails | null>;
  fetchEditCompany: (id: string) => Promise<CompanyDetails | null>;
  addCompany: (data: FormData) => Promise<boolean>;
  updateCompany: (data: FormData) => Promise<boolean>;
  deleteCompany: (id: string) => Promise<boolean>;
}

/**
 * Hook for superadmin company management via REST API
 */
export const useSuperadminCompaniesREST = (): UseSuperadminCompaniesReturn => {
  const { getToken } = useAuth();

  // Data states
  const [packages, setPackages] = useState<Package[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(null);

  // Loading states
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [editDetailsLoading, setEditDetailsLoading] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Helper function to make authenticated API calls
  const apiCall = useCallback(async (
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> => {
    const token = await getToken();
    if (!token) {
      throw new Error('Authentication token not available');
    }

    // If body is a plain object (not FormData or string), JSON.stringify it
    let processedBody = options.body;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      ...(options.headers as Record<string, string>),
    };

    if (options.body && !(options.body instanceof FormData) && typeof options.body !== 'string') {
      processedBody = JSON.stringify(options.body);
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      body: processedBody,
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || result.message || 'API request failed');
    }

    return result;
  }, [getToken]);

  // Fetch packages
  const fetchPackages = useCallback(async (): Promise<Package[] | null> => {
    setPackagesLoading(true);
    setError(null);

    try {
      const result = await apiCall('/api/superadmin/packages');
      setPackages(result.data || []);
      return result.data || [];
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch packages';
      setError(errorMsg);
      console.error('[useSuperadminCompaniesREST] Error fetching packages:', err);
      return null;
    } finally {
      setPackagesLoading(false);
    }
  }, [apiCall]);

  // Fetch companies
  const fetchCompanies = useCallback(async (
    filters?: { status?: string; startDate?: string; endDate?: string }
  ): Promise<Company[] | null> => {
    setCompaniesLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      if (filters?.status) queryParams.append('status', filters.status);
      if (filters?.startDate) queryParams.append('startDate', filters.startDate);
      if (filters?.endDate) queryParams.append('endDate', filters.endDate);

      const queryString = queryParams.toString();
      const endpoint = `/api/superadmin/companies${queryString ? `?${queryString}` : ''}`;

      const result = await apiCall(endpoint);
      setCompanies(result.data || []);
      return result.data || [];
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch companies';
      setError(errorMsg);
      console.error('[useSuperadminCompaniesREST] Error fetching companies:', err);
      return null;
    } finally {
      setCompaniesLoading(false);
    }
  }, [apiCall]);

  // Fetch stats
  const fetchStats = useCallback(async (): Promise<CompanyStats | null> => {
    setStatsLoading(true);
    setError(null);

    try {
      const result = await apiCall('/api/superadmin/companies/stats');
      setStats(result.data || null);
      return result.data || null;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch stats';
      setError(errorMsg);
      console.error('[useSuperadminCompaniesREST] Error fetching stats:', err);
      return null;
    } finally {
      setStatsLoading(false);
    }
  }, [apiCall]);

  // View company details
  const viewCompany = useCallback(async (id: string): Promise<CompanyDetails | null> => {
    setDetailsLoading(true);
    setError(null);

    try {
      const result = await apiCall(`/api/superadmin/companies/${id}`);
      setCompanyDetails(result.data || null);
      return result.data || null;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch company details';
      setError(errorMsg);
      console.error('[useSuperadminCompaniesREST] Error viewing company:', err);
      return null;
    } finally {
      setDetailsLoading(false);
    }
  }, [apiCall]);

  // Fetch company for editing
  const fetchEditCompany = useCallback(async (id: string): Promise<CompanyDetails | null> => {
    setEditDetailsLoading(true);
    setError(null);

    try {
      const result = await apiCall(`/api/superadmin/companies/${id}/edit`);
      setCompanyDetails(result.data || null);
      return result.data || null;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch company for editing';
      setError(errorMsg);
      console.error('[useSuperadminCompaniesREST] Error fetching edit company:', err);
      return null;
    } finally {
      setEditDetailsLoading(false);
    }
  }, [apiCall]);

  // Add company
  const addCompany = useCallback(async (data: FormData): Promise<boolean> => {
    setError(null);

    try {
      await apiCall('/api/superadmin/companies', {
        method: 'POST',
        body: data,
        // Don't set Content-Type header for FormData - let browser set it with boundary
      });

      // Refresh data after successful add
      await fetchCompanies();
      await fetchStats();

      return true;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to add company';
      setError(errorMsg);
      console.error('[useSuperadminCompaniesREST] Error adding company:', err);
      return false;
    }
  }, [apiCall, fetchCompanies, fetchStats]);

  // Update company
  const updateCompany = useCallback(async (data: FormData): Promise<boolean> => {
    setError(null);

    try {
      const companyId = data.get('_id') as string;
      if (!companyId) {
        throw new Error('Company ID is required');
      }

      await apiCall(`/api/superadmin/companies/${companyId}`, {
        method: 'PUT',
        body: data,
      });

      // Refresh data after successful update
      await fetchCompanies();
      await fetchStats();

      return true;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to update company';
      setError(errorMsg);
      console.error('[useSuperadminCompaniesREST] Error updating company:', err);
      return false;
    }
  }, [apiCall, fetchCompanies, fetchStats]);

  // Delete company
  const deleteCompany = useCallback(async (id: string): Promise<boolean> => {
    setError(null);

    try {
      await apiCall(`/api/superadmin/companies/${id}`, {
        method: 'DELETE',
      });

      // Refresh data after successful delete
      await fetchCompanies();
      await fetchStats();

      return true;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to delete company';
      setError(errorMsg);
      console.error('[useSuperadminCompaniesREST] Error deleting company:', err);
      return false;
    }
  }, [apiCall, fetchCompanies, fetchStats]);

  return {
    // Data
    packages,
    companies,
    stats,
    companyDetails,

    // Loading states
    packagesLoading,
    companiesLoading,
    statsLoading,
    detailsLoading,
    editDetailsLoading,

    // Error state
    error,

    // Actions
    fetchPackages,
    fetchCompanies,
    fetchStats,
    viewCompany,
    fetchEditCompany,
    addCompany,
    updateCompany,
    deleteCompany,
  };
};

export default useSuperadminCompaniesREST;
