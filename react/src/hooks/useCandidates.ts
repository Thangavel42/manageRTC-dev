import { useState, useCallback, useEffect } from 'react';
import { useSocket } from '../SocketContext';
import { message } from 'antd';
import { Socket } from 'socket.io-client';

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
    recruiterName?: string;
    source?: string;
    referredBy?: string;
    jobId?: string;
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
  const socket = useSocket() as Socket | null;
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [stats, setStats] = useState<CandidateStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Fetch all candidate data (candidates + stats)
  const fetchAllData = useCallback((filters: CandidateFilters = {}) => {
    if (!socket) {
      console.warn('[useCandidates] Socket not available');
      return;
    }

    setLoading(true);
    setError(null);
    console.log('[useCandidates] Fetching all candidate data with filters:', filters);
    socket.emit('candidate:getAllData', filters);
  }, [socket]);

  // Create candidate
  const createCandidate = useCallback(async (candidateData: Partial<Candidate>): Promise<boolean> => {
    if (!socket) {
      message.error('Socket connection not available');
      return false;
    }

    return new Promise((resolve) => {
      console.log('[useCandidates] Creating candidate:', candidateData);
      socket.emit('candidate:create', candidateData);

      const handleResponse = (response: any) => {
        console.log('[useCandidates] Candidate create response received:', response);
        if (response.done) {
          console.log('[useCandidates] Candidate created successfully:', response.data);
          message.success('Candidate created successfully!');
          fetchAllData(); // Refresh data
          resolve(true);
        } else {
          console.error('[useCandidates] Failed to create candidate:', response.error);
          message.error(`Failed to create candidate: ${response.error}`);
          resolve(false);
        }
        socket.off('candidate:create-response', handleResponse);
      };

      socket.on('candidate:create-response', handleResponse);
    });
  }, [socket, fetchAllData]);

  // Update candidate
  const updateCandidate = useCallback(async (candidateId: string, updateData: Partial<Candidate>): Promise<boolean> => {
    if (!socket) {
      message.error('Socket connection not available');
      return false;
    }

    return new Promise((resolve) => {
      console.log('[useCandidates] Updating candidate:', { candidateId, updateData });
      socket.emit('candidate:update', { _id: candidateId, ...updateData });

      const handleResponse = (response: any) => {
        console.log('[useCandidates] Candidate update response received:', response);
        if (response.done) {
          console.log('[useCandidates] Candidate updated successfully:', response.data);
          message.success('Candidate updated successfully!');
          fetchAllData(); // Refresh data
          resolve(true);
        } else {
          console.error('[useCandidates] Failed to update candidate:', response.error);
          message.error(`Failed to update candidate: ${response.error}`);
          resolve(false);
        }
        socket.off('candidate:update-response', handleResponse);
      };

      socket.on('candidate:update-response', handleResponse);
    });
  }, [socket, fetchAllData]);

  // Delete candidate
  const deleteCandidate = useCallback(async (candidateId: string): Promise<boolean> => {
    if (!socket) {
      message.error('Socket connection not available');
      return false;
    }

    return new Promise((resolve) => {
      console.log('[useCandidates] Deleting candidate:', candidateId);
      socket.emit('candidate:delete', candidateId);

      const handleResponse = (response: any) => {
        console.log('[useCandidates] Candidate delete response received:', response);
        if (response.done) {
          console.log('[useCandidates] Candidate deleted successfully:', response.data);
          message.success('Candidate deleted successfully!');
          fetchAllData(); // Refresh data
          resolve(true);
        } else {
          console.error('[useCandidates] Failed to delete candidate:', response.error);
          message.error(`Failed to delete candidate: ${response.error}`);
          resolve(false);
        }
        socket.off('candidate:delete-response', handleResponse);
      };

      socket.on('candidate:delete-response', handleResponse);
    });
  }, [socket, fetchAllData]);

  // Get candidate by ID
  const getCandidateById = useCallback(async (candidateId: string): Promise<Candidate | null> => {
    if (!socket) {
      message.error('Socket connection not available');
      return null;
    }

    return new Promise((resolve) => {
      console.log('[useCandidates] Getting candidate by ID:', candidateId);
      socket.emit('candidate:getById', candidateId);

      const handleResponse = (response: any) => {
        console.log('[useCandidates] Candidate getById response received:', response);
        if (response.done) {
          console.log('[useCandidates] Candidate retrieved successfully:', response.data);
          resolve(response.data);
        } else {
          console.error('[useCandidates] Failed to get candidate:', response.error);
          message.error(`Failed to get candidate: ${response.error}`);
          resolve(null);
        }
        socket.off('candidate:getById-response', handleResponse);
      };

      socket.on('candidate:getById-response', handleResponse);
    });
  }, [socket]);

  // Update candidate status
  const updateCandidateStatus = useCallback(async (candidateId: string, status: string, notes?: string): Promise<boolean> => {
    if (!socket) {
      message.error('Socket connection not available');
      return false;
    }

    return new Promise((resolve) => {
      console.log('[useCandidates] Updating candidate status:', { candidateId, status, notes });
      socket.emit('candidate:updateStatus', { candidateId, status, notes });

      const handleResponse = (response: any) => {
        console.log('[useCandidates] Candidate status update response received:', response);
        if (response.done) {
          console.log('[useCandidates] Candidate status updated successfully:', response.data);
          message.success(`Status updated to ${status}!`);
          fetchAllData(); // Refresh data
          resolve(true);
        } else {
          console.error('[useCandidates] Failed to update candidate status:', response.error);
          message.error(`Failed to update status: ${response.error}`);
          resolve(false);
        }
        socket.off('candidate:updateStatus-response', handleResponse);
      };

      socket.on('candidate:updateStatus-response', handleResponse);
    });
  }, [socket, fetchAllData]);

  // Filter candidates
  const filterCandidates = useCallback((filters: CandidateFilters) => {
    console.log('[useCandidates] Filtering candidates with:', filters);
    fetchAllData(filters);
  }, [fetchAllData]);

  // Search candidates
  const searchCandidates = useCallback((searchQuery: string) => {
    console.log('[useCandidates] Searching candidates with:', searchQuery);
    const filters: CandidateFilters = { search: searchQuery };
    fetchAllData(filters);
  }, [fetchAllData]);

  // Set up socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleGetAllDataResponse = (response: any) => {
      console.log('[useCandidates] getAllData response received:', response);
      setLoading(false);
      if (response.done) {
        console.log('[useCandidates] Candidates data received:', response.data.candidates);
        console.log('[useCandidates] Stats data received:', response.data.stats);
        setCandidates(response.data.candidates || []);
        setStats(response.data.stats || {});
        setError(null);
      } else {
        console.error('[useCandidates] Failed to get candidates data:', response.error);
        setError(response.error);
        setCandidates([]);
        setStats(null);
      }
    };

    // Listen for real-time updates
    const handleCandidateCreated = (response: any) => {
      if (response.done && response.data) {
        console.log('[useCandidates] Candidate created via broadcast:', response.data);
        fetchAllData();
      }
    };

    const handleCandidateUpdated = (response: any) => {
      if (response.done && response.data) {
        console.log('[useCandidates] Candidate updated via broadcast:', response.data);
        fetchAllData();
      }
    };

    const handleCandidateDeleted = (response: any) => {
      if (response.done && response.data) {
        console.log('[useCandidates] Candidate deleted via broadcast:', response.data);
        fetchAllData();
      }
    };

    const handleStatusUpdated = (response: any) => {
      if (response.done && response.data) {
        console.log('[useCandidates] Candidate status updated via broadcast:', response.data);
        fetchAllData();
      }
    };

    socket.on('candidate:getAllData-response', handleGetAllDataResponse);
    socket.on('candidate:candidate-created', handleCandidateCreated);
    socket.on('candidate:candidate-updated', handleCandidateUpdated);
    socket.on('candidate:candidate-deleted', handleCandidateDeleted);
    socket.on('candidate:status-updated', handleStatusUpdated);

    return () => {
      socket.off('candidate:getAllData-response', handleGetAllDataResponse);
      socket.off('candidate:candidate-created', handleCandidateCreated);
      socket.off('candidate:candidate-updated', handleCandidateUpdated);
      socket.off('candidate:candidate-deleted', handleCandidateDeleted);
      socket.off('candidate:status-updated', handleStatusUpdated);
    };
  }, [socket, fetchAllData]);

  // Export candidates as PDF
  const exportPDF = useCallback(async () => {
    if (!socket) {
      message.error("Socket connection not available");
      return;
    }

    setExporting(true);
    try {
      console.log("Starting PDF export...");
      socket.emit("candidate:export-pdf");

      const handlePDFResponse = (response: any) => {
        if (response.done) {
          console.log("PDF generated successfully:", response.data.pdfUrl);
          const link = document.createElement('a');
          link.href = response.data.pdfUrl;
          link.download = `candidates_${Date.now()}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          message.success("PDF exported successfully!");
        } else {
          console.error("PDF export failed:", response.error);
          message.error(`PDF export failed: ${response.error}`);
        }
        setExporting(false);
        socket.off("candidate:export-pdf-response", handlePDFResponse);
      };

      socket.on("candidate:export-pdf-response", handlePDFResponse);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      message.error("Failed to export PDF");
      setExporting(false);
    }
  }, [socket]);

  // Export candidates as Excel
  const exportExcel = useCallback(async () => {
    if (!socket) {
      message.error("Socket connection not available");
      return;
    }

    setExporting(true);
    try {
      console.log("Starting Excel export...");
      socket.emit("candidate:export-excel");

      const handleExcelResponse = (response: any) => {
        if (response.done) {
          console.log("Excel generated successfully:", response.data.excelUrl);
          const link = document.createElement('a');
          link.href = response.data.excelUrl;
          link.download = `candidates_${Date.now()}.xlsx`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          message.success("Excel exported successfully!");
        } else {
          console.error("Excel export failed:", response.error);
          message.error(`Excel export failed: ${response.error}`);
        }
        setExporting(false);
        socket.off("candidate:export-excel-response", handleExcelResponse);
      };

      socket.on("candidate:export-excel-response", handleExcelResponse);
    } catch (error) {
      console.error("Error exporting Excel:", error);
      message.error("Failed to export Excel");
      setExporting(false);
    }
  }, [socket]);

  // Get candidates by status (for Kanban view)
  const getCandidatesByStatus = useCallback((status: string) => {
    if (!socket) {
      console.warn('[useCandidates] Socket not available');
      return;
    }

    console.log('[useCandidates] Getting candidates by status:', status);
    socket.emit('candidate:getByStatus', status);
  }, [socket]);

  // Get candidates by role
  const getCandidatesByRole = useCallback((role: string) => {
    if (!socket) {
      console.warn('[useCandidates] Socket not available');
      return;
    }

    console.log('[useCandidates] Getting candidates by role:', role);
    socket.emit('candidate:getByRole', role);
  }, [socket]);

  // Get candidates by experience level
  const getCandidatesByExperience = useCallback((experienceLevel: string) => {
    if (!socket) {
      console.warn('[useCandidates] Socket not available');
      return;
    }

    console.log('[useCandidates] Getting candidates by experience:', experienceLevel);
    socket.emit('candidate:getByExperience', experienceLevel);
  }, [socket]);

  // Bulk update candidates
  const bulkUpdateCandidates = useCallback(async (candidateIds: string[], action: string, data?: any): Promise<boolean> => {
    if (!socket) {
      message.error('Socket connection not available');
      return false;
    }

    return new Promise((resolve) => {
      console.log('[useCandidates] Bulk updating candidates:', { candidateIds, action, data });
      socket.emit('candidate:bulkUpdate', { candidateIds, action, ...data });

      const handleResponse = (response: any) => {
        console.log('[useCandidates] Bulk update response received:', response);
        if (response.done) {
          const { successCount, errorCount } = response.data;
          console.log(`[useCandidates] Bulk update completed: ${successCount} success, ${errorCount} errors`);
          message.success(`Updated ${successCount} candidates successfully!`);
          if (errorCount > 0) {
            message.warning(`${errorCount} candidates failed to update`);
          }
          fetchAllData(); // Refresh data
          resolve(true);
        } else {
          console.error('[useCandidates] Failed to bulk update candidates:', response.error);
          message.error(`Failed to bulk update candidates: ${response.error}`);
          resolve(false);
        }
        socket.off('candidate:bulkUpdate-response', handleResponse);
      };

      socket.on('candidate:bulkUpdate-response', handleResponse);
    });
  }, [socket, fetchAllData]);

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