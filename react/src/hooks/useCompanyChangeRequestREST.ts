/**
 * Company Change Request REST API Hook
 * Manages Admin → Superadmin company change requests for sensitive company fields
 * - Create change request (billing, legal, classification, address, contact)
 * - Support multiple fields per request
 * - View my own requests (Admin)
 * - Superadmin: View all requests, approve/reject individual fields or bulk actions
 */

import { useCallback, useState } from 'react';
import { get, patch, post } from '../services/api';
import { handleApiError } from '../services/api';
import { message } from 'antd';

// ─────────────────────────────────────────────────────────────────────────────
// Types for Company Change Request Data
// ─────────────────────────────────────────────────────────────────────────────

export type CompanyChangeRequestType = 'billing' | 'legal' | 'classification' | 'address' | 'contact' | 'multiple';
export type CompanyChangeRequestStatus = 'pending' | 'partially_approved' | 'completed' | 'cancelled';
export type CompanyFieldStatus = 'pending' | 'approved' | 'rejected';

export interface CompanyFieldChange {
  field: string;
  label: string;
  oldValue: any;
  newValue: any;
  status: CompanyFieldStatus;
  reviewNote?: string | null;
  reviewedAt?: Date | null;
}

export interface CompanyChangeRequest {
  _id: string;
  companyId: string;
  companyName: string;
  requestedBy: string;
  requestedByName: string;
  requestType: CompanyChangeRequestType;
  fields: CompanyFieldChange[];
  reason: string;
  status: CompanyChangeRequestStatus;
  createdAt: string | Date;
  updatedAt: string | Date;
  reviewedBy?: string | null;
  reviewerName?: string | null;
  reviewedAt?: string | Date | null;
  cancelledBy?: string | null;
  cancelledByName?: string | null;
  cancelledAt?: string | Date | null;
  cancellationReason?: string | null;
}

export interface CompanyChangeRequestStats {
  pending: number;
  completed: number;
  cancelled: number;
}

// Input types
export interface CompanyFieldChangeInput {
  field: string;
  label?: string;
  newValue: any;
}

export interface CreateCompanyChangeRequestInput {
  requestType?: CompanyChangeRequestType;
  fields?: CompanyFieldChangeInput[];
  reason: string;
}

export interface CompanyChangeRequestFilters {
  status?: CompanyChangeRequestStatus;
  companyId?: string;
  requestType?: CompanyChangeRequestType;
}

export interface ReviewCompanyChangeRequestInput {
  reviewNote?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Company Change Request Hook
 * Manages change requests for sensitive company field updates
 * Supports multiple fields per request with individual field-level approval
 */
export const useCompanyChangeRequestREST = () => {
  const [myRequests, setMyRequests] = useState<CompanyChangeRequest[]>([]);
  const [allRequests, setAllRequests] = useState<CompanyChangeRequest[]>([]);
  const [stats, setStats] = useState<CompanyChangeRequestStats | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Submit a new company change request (Admin)
  const submitChangeRequest = useCallback(async (input: CreateCompanyChangeRequestInput): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      console.log('[useCompanyChangeRequestREST] Submitting change request:', input);

      const response = await post<{ message: string; data?: CompanyChangeRequest }>(
        '/company-change-requests',
        input
      );

      if (response.success) {
        message.success('Company change request submitted successfully. Superadmin will review it shortly.');
        return true;
      } else {
        const errorMsg = response.error?.message || 'Failed to submit company change request';
        message.error(errorMsg);
        setError(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg = handleApiError(err);
      message.error(`Failed to submit company change request: ${errorMsg}`);
      setError(errorMsg);
      console.error('[useCompanyChangeRequestREST] Error creating change request:', err);
      console.error('[useCompanyChangeRequestREST] Error response:', (err as any).response?.data);
      console.error('[useCompanyChangeRequestREST] Error details:', (err as any).response?.data?.error?.details);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch my own company change requests (Admin)
  const fetchMyRequests = useCallback(async (status?: string) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (status) queryParams.append('status', status);

      const queryString = queryParams.toString();
      const response = await get<CompanyChangeRequest[]>(
        `/company-change-requests/my${queryString ? `?${queryString}` : ''}`
      );

      if (response.success && response.data) {
        setMyRequests(response.data);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch company change requests');
      }
    } catch (err) {
      const errorMsg = handleApiError(err);
      setError(errorMsg);
      console.error('[useCompanyChangeRequestREST] Error fetching my requests:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch all company change requests (Superadmin only)
  const fetchAllRequests = useCallback(async (filters?: CompanyChangeRequestFilters) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (filters?.status) queryParams.append('status', filters.status);
      if (filters?.companyId) queryParams.append('companyId', filters.companyId);
      if (filters?.requestType) queryParams.append('requestType', filters.requestType);

      const queryString = queryParams.toString();
      const response = await get<CompanyChangeRequest[]>(
        `/company-change-requests${queryString ? `?${queryString}` : ''}`
      );

      if (response.success && response.data) {
        setAllRequests(response.data);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch company change requests');
      }
    } catch (err) {
      const errorMsg = handleApiError(err);
      setError(errorMsg);
      console.error('[useCompanyChangeRequestREST] Error fetching all requests:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch company change request stats (Superadmin only)
  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await get<CompanyChangeRequestStats>(
        '/company-change-requests/stats'
      );

      if (response.success && response.data) {
        setStats(response.data);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch company change request stats');
      }
    } catch (err) {
      const errorMsg = handleApiError(err);
      setError(errorMsg);
      console.error('[useCompanyChangeRequestREST] Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Approve a specific field in a company change request (Superadmin only)
  const approveField = useCallback(async (
    id: string,
    fieldIdx: number,
    reviewNote?: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await patch<{ message: string }>(
        `/company-change-requests/${id}/field/${fieldIdx}/approve`,
        reviewNote ? { reviewNote } : {}
      );

      if (response.success) {
        message.success(response.message || 'Field approved successfully.');
        await fetchAllRequests();
        return true;
      } else {
        const errorMsg = response.error?.message || 'Failed to approve field';
        message.error(errorMsg);
        setError(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg = handleApiError(err);
      message.error(`Failed to approve field: ${errorMsg}`);
      setError(errorMsg);
      console.error('[useCompanyChangeRequestREST] Error approving field:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchAllRequests]);

  // Reject a specific field in a company change request (Superadmin only)
  const rejectField = useCallback(async (
    id: string,
    fieldIdx: number,
    reviewNote: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      if (!reviewNote || reviewNote.trim().length < 5) {
        message.error('Rejection reason is required (minimum 5 characters)');
        return false;
      }

      const response = await patch<{ message: string }>(
        `/company-change-requests/${id}/field/${fieldIdx}/reject`,
        { reviewNote }
      );

      if (response.success) {
        message.success('Field rejected.');
        await fetchAllRequests();
        return true;
      } else {
        const errorMsg = response.error?.message || 'Failed to reject field';
        message.error(errorMsg);
        setError(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg = handleApiError(err);
      message.error(`Failed to reject field: ${errorMsg}`);
      setError(errorMsg);
      console.error('[useCompanyChangeRequestREST] Error rejecting field:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchAllRequests]);

  // Bulk approve all pending fields in a request (Superadmin only)
  const bulkApprove = useCallback(async (
    id: string,
    reviewNote?: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await patch<{ message: string }>(
        `/company-change-requests/${id}/bulk-approve`,
        reviewNote ? { reviewNote } : {}
      );

      if (response.success) {
        message.success(response.message || 'All pending fields approved successfully.');
        await fetchAllRequests();
        return true;
      } else {
        const errorMsg = response.error?.message || 'Failed to approve fields';
        message.error(errorMsg);
        setError(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg = handleApiError(err);
      message.error(`Failed to approve fields: ${errorMsg}`);
      setError(errorMsg);
      console.error('[useCompanyChangeRequestREST] Error in bulk approve:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchAllRequests]);

  // Bulk reject all pending fields in a request (Superadmin only)
  const bulkReject = useCallback(async (
    id: string,
    reviewNote: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      if (!reviewNote || reviewNote.trim().length < 5) {
        message.error('Rejection reason is required (minimum 5 characters)');
        return false;
      }

      const response = await patch<{ message: string }>(
        `/company-change-requests/${id}/bulk-reject`,
        { reviewNote }
      );

      if (response.success) {
        message.success('All pending fields rejected.');
        await fetchAllRequests();
        return true;
      } else {
        const errorMsg = response.error?.message || 'Failed to reject fields';
        message.error(errorMsg);
        setError(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg = handleApiError(err);
      message.error(`Failed to reject fields: ${errorMsg}`);
      setError(errorMsg);
      console.error('[useCompanyChangeRequestREST] Error in bulk reject:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchAllRequests]);

  // Cancel a pending company change request (Admin)
  const cancelRequest = useCallback(async (
    id: string,
    reason: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      if (!reason || reason.trim().length < 5) {
        message.error('Cancellation reason is required (minimum 5 characters)');
        return false;
      }

      const response = await patch<{ message: string }>(
        `/company-change-requests/${id}/cancel`,
        { reason }
      );

      if (response.success) {
        message.success('Company change request cancelled successfully.');
        await fetchMyRequests();
        await fetchAllRequests();
        return true;
      } else {
        const errorMsg = response.error?.message || 'Failed to cancel request';
        message.error(errorMsg);
        setError(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg = handleApiError(err);
      message.error(`Failed to cancel request: ${errorMsg}`);
      setError(errorMsg);
      console.error('[useCompanyChangeRequestREST] Error cancelling request:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchMyRequests, fetchAllRequests]);

  // Check if there's a pending request for a specific field
  const hasPendingRequestForField = useCallback((field: string): boolean => {
    return myRequests.some(req => {
      const fields = req.fields || [];
      return fields.some(f => f.field === field && f.status === 'pending');
    });
  }, [myRequests]);

  return {
    // Data
    myRequests,
    allRequests,
    stats,

    // State
    loading,
    error,

    // Admin operations
    submitChangeRequest,
    fetchMyRequests,
    hasPendingRequestForField,
    cancelRequest,

    // Superadmin operations - field level
    approveField,
    rejectField,

    // Superadmin operations - bulk
    bulkApprove,
    bulkReject,

    // Superadmin operations - listing & stats
    fetchAllRequests,
    fetchStats,
  };
};
