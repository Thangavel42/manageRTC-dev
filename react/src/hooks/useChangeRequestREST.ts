/**
 * Change Request REST API Hook
 * Phase 1: Manages employee-submitted change requests for sensitive profile fields
 * - Create change request (bank details, name, phone, address, emergency contact)
 * - Support multiple fields per request
 * - View my own requests
 * - HR: View all requests, approve/reject individual fields or bulk actions
 */

import { useCallback, useState } from 'react';
import { get, patch, post } from '../services/api';
import { handleApiError } from '../services/api';
import { message } from 'antd';

// ─────────────────────────────────────────────────────────────────────────────
// Types for Change Request Data
// ─────────────────────────────────────────────────────────────────────────────

export type ChangeRequestType =
  | 'bankDetails'
  | 'name'
  | 'phone'
  | 'address'
  | 'emergencyContact'
  | 'other'
  | 'multiple'; // New type for requests with multiple fields

export type ChangeRequestStatus = 'pending' | 'partially_approved' | 'completed' | 'cancelled';
export type FieldStatus = 'pending' | 'approved' | 'rejected';

export interface FieldChange {
  field: string; // dot-notation path, e.g. "bankDetails.accountNumber"
  label: string; // human-readable label
  oldValue: any;
  newValue: any;
  status: FieldStatus;
  reviewNote?: string | null;
  reviewedAt?: Date | null;
}

export interface ChangeRequest {
  _id: string;
  companyId: string;
  employeeId: string;
  employeeObjectId: string;
  employeeName: string;
  requestType: ChangeRequestType;
  fields: FieldChange[]; // Array of fields in this request
  reason: string;
  status: ChangeRequestStatus;
  requestedAt: string | Date;
  reviewedBy?: string | null;
  reviewerName?: string | null;
  reviewedAt?: string | Date | null;
  reviewNote?: string | null;
  // Cancellation
  cancelledAt?: Date | null;
  cancelledByName?: string | null;
  cancellationReason?: string | null;
  // Legacy fields (for backward compatibility)
  fieldChanged?: string;
  fieldLabel?: string;
  oldValue?: any;
  newValue?: any;
  isDeleted?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface ChangeRequestPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Input types
export interface FieldChangeInput {
  field: string; // dot-notation path
  label?: string; // human-readable label (optional, defaults to field)
  newValue: any;
}

export interface CreateChangeRequestInput {
  requestType?: ChangeRequestType;
  fields?: FieldChangeInput[]; // New: multiple fields support
  reason: string; // minimum 5 characters
  // Legacy single field support
  fieldChanged?: string;
  fieldLabel?: string;
  newValue?: any;
}

export interface ChangeRequestFilters {
  status?: ChangeRequestStatus;
  requestType?: ChangeRequestType;
  employeeId?: string;
  page?: number;
  limit?: number;
}

export interface ReviewChangeRequestInput {
  reviewNote?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Change Request Hook
 * Manages change requests for sensitive profile field updates
 * Supports multiple fields per request with individual field-level approval
 */
export const useChangeRequestREST = () => {
  const [myRequests, setMyRequests] = useState<ChangeRequest[]>([]);
  const [allRequests, setAllRequests] = useState<ChangeRequest[]>([]);
  const [pagination, setPagination] = useState<ChangeRequestPagination | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create a new change request (supports multiple fields)
  const createChangeRequest = useCallback(async (input: CreateChangeRequestInput): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      console.log('[useChangeRequestREST] Creating change request:', input);

      const response = await post<{ message: string; data?: ChangeRequest }>(
        '/change-requests',
        input
      );

      if (response.success) {
        message.success('Change request submitted successfully. HR will review it shortly.');
        return true;
      } else {
        const errorMsg = response.error?.message || 'Failed to submit change request';
        message.error(errorMsg);
        setError(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg = handleApiError(err);
      message.error(`Failed to submit change request: ${errorMsg}`);
      setError(errorMsg);
      console.error('[useChangeRequestREST] Error creating change request:', err);
      console.error('[useChangeRequestREST] Error response:', (err as any).response?.data);
      console.error('[useChangeRequestREST] Error details:', (err as any).response?.data?.error?.details);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch my own change requests
  const fetchMyRequests = useCallback(async (filters?: ChangeRequestFilters) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (filters?.status) queryParams.append('status', filters.status);
      if (filters?.page) queryParams.append('page', String(filters.page));
      if (filters?.limit) queryParams.append('limit', String(filters.limit));

      const queryString = queryParams.toString();
      const response = await get<ChangeRequest[]>(
        `/change-requests/my${queryString ? `?${queryString}` : ''}`
      );

      if (response.success && response.data) {
        setMyRequests(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else {
        throw new Error(response.error?.message || 'Failed to fetch change requests');
      }
    } catch (err) {
      const errorMsg = handleApiError(err);
      setError(errorMsg);
      console.error('[useChangeRequestREST] Error fetching my requests:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch all change requests (HR/Admin only)
  const fetchAllRequests = useCallback(async (filters?: ChangeRequestFilters) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (filters?.status) queryParams.append('status', filters.status);
      if (filters?.requestType) queryParams.append('requestType', filters.requestType);
      if (filters?.employeeId) queryParams.append('employeeId', filters.employeeId);
      if (filters?.page) queryParams.append('page', String(filters.page));
      if (filters?.limit) queryParams.append('limit', String(filters.limit));

      const queryString = queryParams.toString();
      const response = await get<ChangeRequest[]>(
        `/change-requests${queryString ? `?${queryString}` : ''}`
      );

      if (response.success && response.data) {
        setAllRequests(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else {
        throw new Error(response.error?.message || 'Failed to fetch change requests');
      }
    } catch (err) {
      const errorMsg = handleApiError(err);
      setError(errorMsg);
      console.error('[useChangeRequestREST] Error fetching all requests:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Approve a specific field in a change request (HR/Admin only)
  const approveField = useCallback(async (
    id: string,
    fieldIndex: number,
    input?: ReviewChangeRequestInput
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await patch<{ message: string }>(
        `/change-requests/${id}/field/${fieldIndex}/approve`,
        input || {}
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
      console.error('[useChangeRequestREST] Error approving field:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchAllRequests]);

  // Reject a specific field in a change request (HR/Admin only)
  const rejectField = useCallback(async (
    id: string,
    fieldIndex: number,
    input: ReviewChangeRequestInput
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      if (!input.reviewNote || input.reviewNote.trim().length < 5) {
        message.error('Rejection reason is required (minimum 5 characters)');
        return false;
      }

      const response = await patch<{ message: string }>(
        `/change-requests/${id}/field/${fieldIndex}/reject`,
        input
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
      console.error('[useChangeRequestREST] Error rejecting field:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchAllRequests]);

  // Bulk approve all pending fields in a request (HR/Admin only)
  const bulkApproveFields = useCallback(async (
    id: string,
    input?: ReviewChangeRequestInput
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await patch<{ message: string }>(
        `/change-requests/${id}/bulk-approve`,
        input || {}
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
      console.error('[useChangeRequestREST] Error in bulk approve:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchAllRequests]);

  // Bulk reject all pending fields in a request (HR/Admin only)
  const bulkRejectFields = useCallback(async (
    id: string,
    input: ReviewChangeRequestInput
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      if (!input.reviewNote || input.reviewNote.trim().length < 5) {
        message.error('Rejection reason is required (minimum 5 characters)');
        return false;
      }

      const response = await patch<{ message: string }>(
        `/change-requests/${id}/bulk-reject`,
        input
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
      console.error('[useChangeRequestREST] Error in bulk reject:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchAllRequests]);

  // Cancel a pending change request (Employee or HR)
  const cancelChangeRequest = useCallback(async (
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
        `/change-requests/${id}/cancel`,
        { reason }
      );

      if (response.success) {
        message.success('Change request cancelled successfully.');
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
      console.error('[useChangeRequestREST] Error cancelling request:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchMyRequests, fetchAllRequests]);

  // Legacy: Approve entire request (approves all pending fields)
  const approveChangeRequest = useCallback(async (
    id: string,
    input?: ReviewChangeRequestInput
  ): Promise<boolean> => {
    return bulkApproveFields(id, input);
  }, [bulkApproveFields]);

  // Legacy: Reject entire request (rejects all pending fields)
  const rejectChangeRequest = useCallback(async (
    id: string,
    input: ReviewChangeRequestInput
  ): Promise<boolean> => {
    return bulkRejectFields(id, input);
  }, [bulkRejectFields]);

  // Check if there's a pending request for a specific field
  const hasPendingRequestForField = useCallback((fieldChanged: string): boolean => {
    return myRequests.some(req => {
      const fields = req.fields || [];
      return fields.some(f => f.field === fieldChanged && f.status === 'pending');
    });
  }, [myRequests]);

  // Get field status for a specific field
  const getFieldStatus = useCallback((fieldChanged: string): FieldStatus | null => {
    for (const req of myRequests) {
      const fields = req.fields || [];
      const field = fields.find(f => f.field === fieldChanged);
      if (field && field.status !== 'approved') {
        return field.status;
      }
    }
    return null;
  }, [myRequests]);

  return {
    // Data
    myRequests,
    allRequests,
    pagination,

    // State
    loading,
    error,

    // Employee operations
    createChangeRequest,
    fetchMyRequests,
    hasPendingRequestForField,
    getFieldStatus,
    cancelChangeRequest,

    // HR/Admin operations - field level
    approveField,
    rejectField,

    // HR/Admin operations - bulk
    bulkApproveFields,
    bulkRejectFields,

    // Legacy operations (approve/reject entire request)
    approveChangeRequest,
    rejectChangeRequest,
    fetchAllRequests,
  };
};
