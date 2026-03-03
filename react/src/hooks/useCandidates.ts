import { message } from 'antd';
import { useCallback, useState } from 'react';
import { ApiResponse, del, get, patch, post, put } from '../services/api';

export interface Candidate {
  _id: string;
  applicationNumber?: string;
  companyId: string;

  // Personal Information
  personalInfo?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
    nationality?: string;
    religion?: string;
    maritalStatus?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    linkedinProfile?: string;
    portfolio?: string;
  };

  // Professional Information
  professionalInfo?: {
    currentRole?: string;
    currentCompany?: string;
    experienceYears?: number;
    currentSalary?: number;
    expectedSalary?: number;
    noticePeriod?: string;
    skills?: string[];
    qualifications?: string[];
    certifications?: string[];
    languages?: string[];
  };

  // Application Information
  applicationInfo?: {
    appliedRole?: string;
    appliedDate?: string;
    recruiterId?: string;
    source?: string;
    referredBy?: string;
    jobId?: string;
    // Populated fields from backend aggregation
    appliedRoleDetails?: {
      _id?: string;
      designation?: string;
      department?: string;
      status?: string;
    };
    recruiterDetails?: {
      _id?: string;
      firstName?: string;
      lastName?: string;
      fullName?: string;
      employeeId?: string;
      email?: string;
    };
    referredByDetails?: {
      _id?: string;
      firstName?: string;
      lastName?: string;
      fullName?: string;
      employeeId?: string;
      email?: string;
    };
  };

  // Documents
  documents?: {
    resume?: string;
    coverLetter?: string;
    portfolio?: string;
    others?: string[];
  };

  // Ratings
  ratings?: {
    technical?: number;
    communication?: number;
    cultural?: number;
    overall?: number;
  };

  // Interview Information
  interviewInfo?: {
    rounds?: any[];
    feedback?: any[];
    nextInterviewDate?: string | null;
  };

  // Status and Timeline
  status: string;
  timeline?: Array<{
    status: string;
    date: string;
    notes: string;
    updatedBy: string;
  }>;

  // Generated fields
  fullName: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

export interface CandidateStats {
  totalCandidates: number;
  newCandidates: number;
  monthlyHires: number;
  newApplications: number;
  screening: number;
  interview: number;
  hired: number;
  statusBreakdown?: Array<{
    _id: string;
    count: number;
  }>;
  topRoles?: Array<{
    _id: string;
    count: number;
  }>;
}

export interface CandidateFilters {
  status?: string;
  appliedRole?: string;
  experienceLevel?: string;
  recruiterId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const useCandidates = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [stats, setStats] = useState<CandidateStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Fetch all candidate data (candidates + stats)
  const fetchAllData = useCallback(async (filters: CandidateFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      console.log('[useCandidates] Fetching all candidate data with filters:', filters);
      const response: ApiResponse = await get('/candidates/all-data', { params: filters });

      if (response.success && response.data) {
        console.log('[useCandidates] Candidates data received:', response.data.candidates);
        console.log('[useCandidates] Stats data received:', response.data.stats);
        setCandidates(response.data.candidates || []);
        setStats(response.data.stats || {});
        setError(null);
      }
    } catch (err: any) {
      const errorData = err.response?.data?.error;
      const errorMessage =
        typeof errorData === 'string'
          ? errorData
          : errorData?.message ||
            err.response?.data?.message ||
            err.message ||
            'Failed to fetch candidates';
      console.error('[useCandidates] Failed to get candidates data:', errorMessage);
      setError(errorMessage);
      setCandidates([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create candidate
  const createCandidate = useCallback(
    async (candidateData: Partial<Candidate>): Promise<boolean> => {
      try {
        console.log('[useCandidates] Creating candidate:', candidateData);
        const response: ApiResponse = await post('/candidates', candidateData);

        if (response.success) {
          console.log('[useCandidates] Candidate created successfully:', response.data);
          message.success('Candidate created successfully!');
          // Don't refresh here - let parent components handle refresh via event
          return true;
        }
        return false;
      } catch (err: any) {
        const errorData = err.response?.data?.error;
        const errorMessage =
          typeof errorData === 'string'
            ? errorData
            : errorData?.message ||
              err.response?.data?.message ||
              err.message ||
              'Failed to create candidate';
        console.error('[useCandidates] Failed to create candidate:', errorMessage);
        message.error(`Failed to create candidate: ${errorMessage}`);
        return false;
      }
    },
    []
  );

  // Update candidate
  const updateCandidate = useCallback(
    async (candidateId: string, updateData: Partial<Candidate>): Promise<boolean> => {
      try {
        console.log('[useCandidates] Updating candidate:', { candidateId, updateData });
        const response: ApiResponse = await put(`/candidates/${candidateId}`, updateData);

        if (response.success) {
          console.log('[useCandidates] Candidate updated successfully:', response.data);
          message.success('Candidate updated successfully!');
          await fetchAllData(); // Refresh data
          return true;
        }
        return false;
      } catch (err: any) {
        const errorData = err.response?.data?.error;
        const errorMessage =
          typeof errorData === 'string'
            ? errorData
            : errorData?.message ||
              err.response?.data?.message ||
              err.message ||
              'Failed to update candidate';
        console.error('[useCandidates] Failed to update candidate:', errorMessage);
        message.error(`Failed to update candidate: ${errorMessage}`);
        return false;
      }
    },
    [fetchAllData]
  );

  // Delete candidate
  const deleteCandidate = useCallback(
    async (candidateId: string): Promise<boolean> => {
      try {
        console.log('[useCandidates] Deleting candidate:', candidateId);
        const response: ApiResponse = await del(`/candidates/${candidateId}`);

        if (response.success) {
          console.log('[useCandidates] Candidate deleted successfully:', response.data);
          message.success('Candidate deleted successfully!');
          await fetchAllData(); // Refresh data
          return true;
        }
        return false;
      } catch (err: any) {
        const errorData = err.response?.data?.error;
        const errorMessage =
          typeof errorData === 'string'
            ? errorData
            : errorData?.message ||
              err.response?.data?.message ||
              err.message ||
              'Failed to delete candidate';
        console.error('[useCandidates] Failed to delete candidate:', errorMessage);
        message.error(`Failed to delete candidate: ${errorMessage}`);
        return false;
      }
    },
    [fetchAllData]
  );

  // Get candidate by ID
  const getCandidateById = useCallback(async (candidateId: string): Promise<Candidate | null> => {
    try {
      console.log('[useCandidates] Getting candidate by ID:', candidateId);
      const response: ApiResponse = await get(`/candidates/${candidateId}`);

      if (response.success && response.data) {
        console.log('[useCandidates] Candidate retrieved successfully:', response.data);
        return response.data;
      }
      return null;
    } catch (err: any) {
      const errorData = err.response?.data?.error;
      const errorMessage =
        typeof errorData === 'string'
          ? errorData
          : errorData?.message ||
            err.response?.data?.message ||
            err.message ||
            'Failed to get candidate';
      console.error('[useCandidates] Failed to get candidate:', errorMessage);
      message.error(`Failed to get candidate: ${errorMessage}`);
      return null;
    }
  }, []);

  // Update candidate status
  const updateCandidateStatus = useCallback(
    async (candidateId: string, status: string, notes?: string): Promise<boolean> => {
      try {
        console.log('[useCandidates] Updating candidate status:', { candidateId, status, notes });
        const response: ApiResponse = await patch(`/candidates/${candidateId}/status`, {
          status,
          notes,
        });

        if (response.success) {
          console.log('[useCandidates] Candidate status updated successfully:', response.data);
          message.success(`Status updated to ${status}!`);
          await fetchAllData(); // Refresh data
          return true;
        }
        return false;
      } catch (err: any) {
        const errorData = err.response?.data?.error;
        const errorMessage =
          typeof errorData === 'string'
            ? errorData
            : errorData?.message ||
              err.response?.data?.message ||
              err.message ||
              'Failed to update status';
        console.error('[useCandidates] Failed to update candidate status:', errorMessage);
        message.error(`Failed to update status: ${errorMessage}`);
        return false;
      }
    },
    [fetchAllData]
  );

  // Filter candidates
  const filterCandidates = useCallback(
    (filters: CandidateFilters) => {
      console.log('[useCandidates] Filtering candidates with:', filters);
      fetchAllData(filters);
    },
    [fetchAllData]
  );

  // Search candidates
  const searchCandidates = useCallback(
    (searchQuery: string) => {
      console.log('[useCandidates] Searching candidates with:', searchQuery);
      const filters: CandidateFilters = { search: searchQuery };
      fetchAllData(filters);
    },
    [fetchAllData]
  );

  // Export candidates as PDF
  const exportPDF = useCallback(async () => {
    setExporting(true);
    try {
      console.log('Starting PDF export...');
      const response: ApiResponse = await post('/candidates/export/pdf', {});

      if (response.success && response.data.pdfUrl) {
        console.log('PDF generated successfully:', response.data.pdfUrl);
        const link = document.createElement('a');
        link.href = response.data.pdfUrl;
        link.download = `candidates_${Date.now()}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        message.success('PDF exported successfully!');
      }
    } catch (err: any) {
      const errorData = err.response?.data?.error;
      const errorMessage =
        typeof errorData === 'string'
          ? errorData
          : errorData?.message ||
            err.response?.data?.message ||
            err.message ||
            'Failed to export PDF';
      console.error('PDF export failed:', errorMessage);
      message.error(`PDF export failed: ${errorMessage}`);
    } finally {
      setExporting(false);
    }
  }, []);

  // Export candidates as Excel
  const exportExcel = useCallback(async () => {
    setExporting(true);
    try {
      console.log('Starting Excel export...');
      const response: ApiResponse = await post('/candidates/export/excel', {});

      if (response.success && response.data.excelUrl) {
        console.log('Excel generated successfully:', response.data.excelUrl);
        const link = document.createElement('a');
        link.href = response.data.excelUrl;
        link.download = `candidates_${Date.now()}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        message.success('Excel exported successfully!');
      }
    } catch (err: any) {
      const errorData = err.response?.data?.error;
      const errorMessage =
        typeof errorData === 'string'
          ? errorData
          : errorData?.message ||
            err.response?.data?.message ||
            err.message ||
            'Failed to export Excel';
      console.error('Excel export failed:', errorMessage);
      message.error(`Excel export failed: ${errorMessage}`);
    } finally {
      setExporting(false);
    }
  }, []);

  // Get candidates by status (for Kanban view)
  const getCandidatesByStatus = useCallback(
    (status: string) => {
      console.log('[useCandidates] Getting candidates by status:', status);
      fetchAllData({ status });
    },
    [fetchAllData]
  );

  // Get candidates by role
  const getCandidatesByRole = useCallback(
    (role: string) => {
      console.log('[useCandidates] Getting candidates by role:', role);
      fetchAllData({ appliedRole: role });
    },
    [fetchAllData]
  );

  // Get candidates by experience level
  const getCandidatesByExperience = useCallback(
    (experienceLevel: string) => {
      console.log('[useCandidates] Getting candidates by experience:', experienceLevel);
      fetchAllData({ experienceLevel });
    },
    [fetchAllData]
  );

  // Bulk update candidates
  const bulkUpdateCandidates = useCallback(
    async (candidateIds: string[], action: string, data?: any): Promise<boolean> => {
      try {
        console.log('[useCandidates] Bulk updating candidates:', { candidateIds, action, data });
        const response: ApiResponse = await post('/candidates/bulk-update', {
          candidateIds,
          action,
          ...data,
        });

        if (response.success && response.data) {
          const { successCount, errorCount } = response.data;
          console.log(
            `[useCandidates] Bulk update completed: ${successCount} success, ${errorCount} errors`
          );
          message.success(`Updated ${successCount} candidates successfully!`);
          if (errorCount > 0) {
            message.warning(`${errorCount} candidates failed to update`);
          }
          await fetchAllData(); // Refresh data
          return true;
        }
        return false;
      } catch (err: any) {
        const errorData = err.response?.data?.error;
        const errorMessage =
          typeof errorData === 'string'
            ? errorData
            : errorData?.message ||
              err.response?.data?.message ||
              err.message ||
              'Failed to bulk update candidates';
        console.error('[useCandidates] Failed to bulk update candidates:', errorMessage);
        message.error(`Failed to bulk update candidates: ${errorMessage}`);
        return false;
      }
    },
    [fetchAllData]
  );

  return {
    // Data
    candidates,
    stats,
    loading,
    error,
    exporting,

    // Core operations
    fetchAllData,
    createCandidate,
    updateCandidate,
    deleteCandidate,
    getCandidateById,

    // Status management
    updateCandidateStatus,

    // Filtering and search
    filterCandidates,
    searchCandidates,
    getCandidatesByStatus,
    getCandidatesByRole,
    getCandidatesByExperience,

    // Export functionality
    exportPDF,
    exportExcel,

    // Bulk operations
    bulkUpdateCandidates,
  };
};
