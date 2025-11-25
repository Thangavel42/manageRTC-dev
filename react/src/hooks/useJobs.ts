import { useState, useCallback, useEffect } from 'react';
import { useSocket } from '../SocketContext';
import { message } from 'antd';
import { Socket } from 'socket.io-client';

export interface Job {
  _id: string;
  title: string;
  category: string;
  type: string;
  description: string;
  requirements: string;
  skills: string[];
  tags: string[];
  location: {
    country: string;
    state: string;
    city: string;
  };
  salaryRange: {
    min: number;
    max: number;
    currency: string;
  };
  numberOfPositions: number;
  status: 'Active' | 'Inactive';
  appliedCount: number;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

export interface JobStats {
  totalJobs: number;
  activeJobs: number;
  inactiveJobs: number;
  newJobs: number;
  byCategory: Array<{
    _id: string;
    count: number;
  }>;
  byType: Array<{
    _id: string;
    count: number;
  }>;
}

export interface JobFilters {
  status?: string;
  category?: string;
  type?: string;
  country?: string;
  state?: string;
  city?: string;
  minSalary?: number;
  maxSalary?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const useJobs = () => {
  const socket = useSocket() as Socket | null;
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<JobStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Fetch all job data (jobs + stats)
  const fetchAllData = useCallback((filters: JobFilters = {}) => {
    if (!socket) {
      console.warn('[useJobs] Socket not available');
      return;
    }

    setLoading(true);
    setError(null);
    console.log('[useJobs] Fetching all job data with filters:', filters);
    socket.emit('job:getAllData', filters);
  }, [socket]);

  // Create job
  const createJob = useCallback(async (jobData: Partial<Job>): Promise<boolean> => {
    if (!socket) {
      message.error('Socket connection not available');
      return false;
    }

    return new Promise((resolve) => {
      console.log('[useJobs] Creating job:', jobData);
      socket.emit('job:create', jobData);

      const handleResponse = (response: any) => {
        console.log('[useJobs] Job create response received:', response);
        if (response.done) {
          console.log('[useJobs] Job created successfully:', response.data);
          message.success('Job created successfully!');
          fetchAllData(); // Refresh data
          resolve(true);
        } else {
          console.error('[useJobs] Failed to create job:', response.error);
          message.error(`Failed to create job: ${response.error}`);
          resolve(false);
        }
        socket.off('job:create-response', handleResponse);
      };

      socket.on('job:create-response', handleResponse);
    });
  }, [socket, fetchAllData]);

  // Update job
  const updateJob = useCallback(async (jobId: string, updateData: Partial<Job>): Promise<boolean> => {
    if (!socket) {
      message.error('Socket connection not available');
      return false;
    }

    return new Promise((resolve) => {
      console.log('[useJobs] Updating job:', { jobId, updateData });
      socket.emit('job:update', { _id: jobId, ...updateData });

      const handleResponse = (response: any) => {
        console.log('[useJobs] Job update response received:', response);
        if (response.done) {
          console.log('[useJobs] Job updated successfully:', response.data);
          message.success('Job updated successfully!');
          fetchAllData(); // Refresh data
          resolve(true);
        } else {
          console.error('[useJobs] Failed to update job:', response.error);
          message.error(`Failed to update job: ${response.error}`);
          resolve(false);
        }
        socket.off('job:update-response', handleResponse);
      };

      socket.on('job:update-response', handleResponse);
    });
  }, [socket, fetchAllData]);

  // Delete job
  const deleteJob = useCallback(async (jobId: string): Promise<boolean> => {
    if (!socket) {
      message.error('Socket connection not available');
      return false;
    }

    return new Promise((resolve) => {
      console.log('[useJobs] Deleting job:', jobId);
      socket.emit('job:delete', jobId);

      const handleResponse = (response: any) => {
        console.log('[useJobs] Job delete response received:', response);
        if (response.done) {
          console.log('[useJobs] Job deleted successfully:', response.data);
          message.success('Job deleted successfully!');
          fetchAllData(); // Refresh data
          resolve(true);
        } else {
          console.error('[useJobs] Failed to delete job:', response.error);
          message.error(`Failed to delete job: ${response.error}`);
          resolve(false);
        }
        socket.off('job:delete-response', handleResponse);
      };

      socket.on('job:delete-response', handleResponse);
    });
  }, [socket, fetchAllData]);

  // Get job by ID
  const getJobById = useCallback(async (jobId: string): Promise<Job | null> => {
    if (!socket) {
      message.error('Socket connection not available');
      return null;
    }

    return new Promise((resolve) => {
      console.log('[useJobs] Getting job by ID:', jobId);
      socket.emit('job:getById', jobId);

      const handleResponse = (response: any) => {
        console.log('[useJobs] Job getById response received:', response);
        if (response.done) {
          console.log('[useJobs] Job retrieved successfully:', response.data);
          resolve(response.data);
        } else {
          console.error('[useJobs] Failed to get job:', response.error);
          message.error(`Failed to get job: ${response.error}`);
          resolve(null);
        }
        socket.off('job:getById-response', handleResponse);
      };

      socket.on('job:getById-response', handleResponse);
    });
  }, [socket]);

  // Filter jobs
  const filterJobs = useCallback((filters: JobFilters) => {
    console.log('[useJobs] Filtering jobs with:', filters);
    fetchAllData(filters);
  }, [fetchAllData]);

  // Search jobs
  const searchJobs = useCallback((searchQuery: string) => {
    console.log('[useJobs] Searching jobs with:', searchQuery);
    const filters: JobFilters = { search: searchQuery };
    fetchAllData(filters);
  }, [fetchAllData]);

  // Set up socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleGetAllDataResponse = (response: any) => {
      console.log('[useJobs] getAllData response received:', response);
      setLoading(false);
      if (response.done) {
        console.log('[useJobs] Jobs data received:', response.data.jobs);
        console.log('[useJobs] Stats data received:', response.data.stats);
        setJobs(response.data.jobs || []);
        setStats(response.data.stats || {});
        setError(null);
      } else {
        console.error('[useJobs] Failed to get jobs data:', response.error);
        setError(response.error);
        setJobs([]);
        setStats(null);
      }
    };

    const handleGetAllResponse = (response: any) => {
      console.log('[useJobs] getAll response received:', response);
      setLoading(false);
      if (response.done) {
        console.log('[useJobs] Jobs data received:', response.data);
        setJobs(response.data || []);
        setError(null);
      } else {
        console.error('[useJobs] Failed to get jobs:', response.error);
        setError(response.error);
        setJobs([]);
      }
    };

    const handleGetStatsResponse = (response: any) => {
      console.log('[useJobs] getStats response received:', response);
      if (response.done) {
        console.log('[useJobs] Stats data received:', response.data);
        setStats(response.data || {});
      } else {
        console.error('[useJobs] Failed to get stats:', response.error);
      }
    };

    // Listen for real-time updates
    const handleJobCreated = (response: any) => {
      if (response.done && response.data) {
        console.log('[useJobs] Job created via broadcast:', response.data);
        fetchAllData();
      }
    };

    const handleJobUpdated = (response: any) => {
      if (response.done && response.data) {
        console.log('[useJobs] Job updated via broadcast:', response.data);
        fetchAllData();
      }
    };

    const handleJobDeleted = (response: any) => {
      if (response.done && response.data) {
        console.log('[useJobs] Job deleted via broadcast:', response.data);
        fetchAllData();
      }
    };

    socket.on('job:getAllData-response', handleGetAllDataResponse);
    socket.on('job:getAll-response', handleGetAllResponse);
    socket.on('job:getStats-response', handleGetStatsResponse);
    socket.on('job:job-created', handleJobCreated);
    socket.on('job:job-updated', handleJobUpdated);
    socket.on('job:job-deleted', handleJobDeleted);

    return () => {
      socket.off('job:getAllData-response', handleGetAllDataResponse);
      socket.off('job:getAll-response', handleGetAllResponse);
      socket.off('job:getStats-response', handleGetStatsResponse);
      socket.off('job:job-created', handleJobCreated);
      socket.off('job:job-updated', handleJobUpdated);
      socket.off('job:job-deleted', handleJobDeleted);
    };
  }, [socket, fetchAllData]);

  // Export jobs as PDF
  const exportPDF = useCallback(async () => {
    if (!socket) {
      message.error("Socket connection not available");
      return;
    }

    setExporting(true);
    try {
      console.log("Starting PDF export...");
      socket.emit("job:export-pdf");

      const handlePDFResponse = (response: any) => {
        if (response.done) {
          console.log("PDF generated successfully:", response.data.pdfUrl);
          const link = document.createElement('a');
          link.href = response.data.pdfUrl;
          link.download = `jobs_${Date.now()}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          message.success("PDF exported successfully!");
        } else {
          console.error("PDF export failed:", response.error);
          message.error(`PDF export failed: ${response.error}`);
        }
        setExporting(false);
        socket.off("job:export-pdf-response", handlePDFResponse);
      };

      socket.on("job:export-pdf-response", handlePDFResponse);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      message.error("Failed to export PDF");
      setExporting(false);
    }
  }, [socket]);

  // Export jobs as Excel
  const exportExcel = useCallback(async () => {
    if (!socket) {
      message.error("Socket connection not available");
      return;
    }

    setExporting(true);
    try {
      console.log("Starting Excel export...");
      socket.emit("job:export-excel");

      const handleExcelResponse = (response: any) => {
        if (response.done) {
          console.log("Excel generated successfully:", response.data.excelUrl);
          const link = document.createElement('a');
          link.href = response.data.excelUrl;
          link.download = `jobs_${Date.now()}.xlsx`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          message.success("Excel exported successfully!");
        } else {
          console.error("Excel export failed:", response.error);
          message.error(`Excel export failed: ${response.error}`);
        }
        setExporting(false);
        socket.off("job:export-excel-response", handleExcelResponse);
      };

      socket.on("job:export-excel-response", handleExcelResponse);
    } catch (error) {
      console.error("Error exporting Excel:", error);
      message.error("Failed to export Excel");
      setExporting(false);
    }
  }, [socket]);

  return {
    // Data
    jobs,
    stats,
    loading,
    error,
    exporting,
    
    // Core operations
    fetchAllData,
    createJob,
    updateJob,
    deleteJob,
    getJobById,
    
    // Filtering and search
    filterJobs,
    searchJobs,
    
    // Export functionality
    exportPDF,
    exportExcel,
  };
};