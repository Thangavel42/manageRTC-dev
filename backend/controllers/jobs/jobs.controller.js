import { ObjectId } from "mongodb";
import {
  getJobsStats as getJobsStatsService,
  getJobsList as getJobsListService,
  getJobDetails as getJobDetailsService,
  createJob as createJobService,
  updateJob as updateJobService,
  deleteJob as deleteJobService,
  bulkDeleteJobs as bulkDeleteJobsService,
  updateJobStatus as updateJobStatusService,
  getJobCategories as getJobCategoriesService,
  getJobTypes as getJobTypesService,
  exportJobsPDF as exportJobsPDFService,
  exportJobsExcel as exportJobsExcelService
} from "../../services/jobs/jobs.services.js";
import { devLog, devDebug, devWarn, devError } from '../../utils/logger.js';


// Get jobs statistics
export const getJobsStats = async (req, res) => {
  try {
    const { companyId } = req.params;
    
    if (!companyId) {
      return res.status(400).json({
        done: false,
        message: "Company ID is required"
      });
    }

    const result = await getJobsStatsService(companyId);
    
    if (result.done) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    devError("Error in getJobsStats controller:", error);
    res.status(500).json({
      done: false,
      message: "Internal server error"
    });
  }
};

// Get jobs list with filters and pagination
export const getJobsList = async (req, res) => {
  try {
    const { companyId } = req.params;
    const filters = {
      companyId,
      ...req.query
    };

    if (!companyId) {
      return res.status(400).json({
        done: false,
        message: "Company ID is required"
      });
    }

    const result = await getJobsListService(filters);
    
    if (result.done) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    devError("Error in getJobsList controller:", error);
    res.status(500).json({
      done: false,
      message: "Internal server error"
    });
  }
};

// Get specific job details
export const getJobDetails = async (req, res) => {
  try {
    const { companyId, jobId } = req.params;
    
    if (!companyId || !jobId) {
      return res.status(400).json({
        done: false,
        message: "Company ID and Job ID are required"
      });
    }

    const result = await getJobDetailsService(jobId, companyId);
    
    if (result.done) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    devError("Error in getJobDetails controller:", error);
    res.status(500).json({
      done: false,
      message: "Internal server error"
    });
  }
};

// Create a new job
export const createJob = async (req, res) => {
  try {
    const { companyId } = req.params;
    const jobData = {
      ...req.body,
      companyId
    };

    if (!companyId) {
      return res.status(400).json({
        done: false,
        message: "Company ID is required"
      });
    }

    const result = await createJobService(jobData);
    
    if (result.done) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    devError("Error in createJob controller:", error);
    res.status(500).json({
      done: false,
      message: "Internal server error"
    });
  }
};

// Update a job
export const updateJob = async (req, res) => {
  try {
    const { companyId, jobId } = req.params;
    const jobData = req.body;

    if (!companyId || !jobId) {
      return res.status(400).json({
        done: false,
        message: "Company ID and Job ID are required"
      });
    }

    const result = await updateJobService(jobId, jobData, companyId);
    
    if (result.done) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    devError("Error in updateJob controller:", error);
    res.status(500).json({
      done: false,
      message: "Internal server error"
    });
  }
};

// Delete a job
export const deleteJob = async (req, res) => {
  try {
    const { companyId, jobId } = req.params;

    if (!companyId || !jobId) {
      return res.status(400).json({
        done: false,
        message: "Company ID and Job ID are required"
      });
    }

    const result = await deleteJobService(jobId, companyId);
    
    if (result.done) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    devError("Error in deleteJob controller:", error);
    res.status(500).json({
      done: false,
      message: "Internal server error"
    });
  }
};

// Bulk delete jobs
export const bulkDeleteJobs = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { jobIds } = req.body;

    if (!companyId) {
      return res.status(400).json({
        done: false,
        message: "Company ID is required"
      });
    }

    if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
      return res.status(400).json({
        done: false,
        message: "Job IDs array is required"
      });
    }

    const result = await bulkDeleteJobsService(jobIds, companyId);
    
    if (result.done) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    devError("Error in bulkDeleteJobs controller:", error);
    res.status(500).json({
      done: false,
      message: "Internal server error"
    });
  }
};

// Update job status
export const updateJobStatus = async (req, res) => {
  try {
    const { companyId, jobId } = req.params;
    const { status } = req.body;

    if (!companyId || !jobId) {
      return res.status(400).json({
        done: false,
        message: "Company ID and Job ID are required"
      });
    }

    if (!status) {
      return res.status(400).json({
        done: false,
        message: "Status is required"
      });
    }

    const result = await updateJobStatusService(jobId, status, companyId);
    
    if (result.done) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    devError("Error in updateJobStatus controller:", error);
    res.status(500).json({
      done: false,
      message: "Internal server error"
    });
  }
};

// Get job categories
export const getJobCategories = async (req, res) => {
  try {
    const result = await getJobCategoriesService();
    
    if (result.done) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    devError("Error in getJobCategories controller:", error);
    res.status(500).json({
      done: false,
      message: "Internal server error"
    });
  }
};

// Get job types
export const getJobTypes = async (req, res) => {
  try {
    const result = await getJobTypesService();
    
    if (result.done) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    devError("Error in getJobTypes controller:", error);
    res.status(500).json({
      done: false,
      message: "Internal server error"
    });
  }
};

// Export jobs as PDF
export const exportJobsPDF = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { userId } = req.query;
    const filters = req.body.filters || {};
    
    if (!companyId) {
      return res.status(400).json({
        done: false,
        message: "Company ID is required"
      });
    }

    if (!userId) {
      return res.status(400).json({
        done: false,
        message: "User ID is required"
      });
    }

    const result = await exportJobsPDFService(companyId, userId, filters);
    
    if (result.done) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    devError("Error in exportJobsPDF controller:", error);
    res.status(500).json({
      done: false,
      message: "Internal server error"
    });
  }
};

// Export jobs as Excel
export const exportJobsExcel = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { userId } = req.query;
    const filters = req.body.filters || {};
    
    if (!companyId) {
      return res.status(400).json({
        done: false,
        message: "Company ID is required"
      });
    }

    if (!userId) {
      return res.status(400).json({
        done: false,
        message: "User ID is required"
      });
    }

    const result = await exportJobsExcelService(companyId, userId, filters);
    
    if (result.done) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    devError("Error in exportJobsExcel controller:", error);
    res.status(500).json({
      done: false,
      message: "Internal server error"
    });
  }
};
