import { ObjectId } from "mongodb";
import fs from "fs";
import { 
  getJobsList as getJobsListService, 
  getJobsStats as getJobsStatsService, 
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

const jobsSocketController = (socket, io) => {
  console.log("Setting up jobs socket controller...");

  const isDevelopment = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "production";

  const validateAccess = (socket) => {
    if (!socket.companyId) {
      console.error("[Jobs] Company ID not found in user metadata", {
        user: socket.user?.sub,
      });
      throw new Error("Company ID not found in user metadata");
    }
    const companyIdRegex = /^[a-zA-Z0-9_-]{3,50}$/;
    if (!companyIdRegex.test(socket.companyId)) {
      console.error(`[Jobs] Invalid company ID format: ${socket.companyId}`);
      throw new Error("Invalid company ID format");
    }
    if (socket.userMetadata?.companyId !== socket.companyId) {
      console.error(
        `[Jobs] Company ID mismatch: user metadata has ${socket.userMetadata?.companyId}, socket has ${socket.companyId}`
      );
      throw new Error("Unauthorized: Company ID mismatch");
    }
    return { companyId: socket.companyId, userId: socket.user?.sub };
  };

  const withRateLimit = (handler) => {
    return async (...args) => {
      if (isDevelopment) {
        return handler(...args);
      }
      if (
        typeof socket.checkRateLimit === "function" &&
        !socket.checkRateLimit()
      ) {
        const eventName = args[0] || "unknown";
        socket.emit(`${eventName}-response`, {
          done: false,
          error: "Rate limit exceeded. Please try again later.",
        });
        return;
      }
      return handler(...args);
    };
  };

  // Get jobs statistics
  const handleGetJobsStats = withRateLimit(async (data) => {
    try {
      console.log("[Jobs] Getting jobs stats:", data);
      const { companyId } = validateAccess(socket);
      
      const result = await getJobsStatsService(companyId);
      socket.emit("jobs/dashboard/get-stats-response", result);
    } catch (error) {
      console.error("[Jobs] Error getting jobs stats:", error);
      socket.emit("jobs/dashboard/get-stats-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Get jobs list
  const handleGetJobsList = withRateLimit(async (data) => {
    try {
      const { companyId } = validateAccess(socket);
      
      // Handle both direct data and nested filters structure
      const filters = {
        companyId,
        ...(data.filters || data)
      };

      const result = await getJobsListService(filters);
      socket.emit("jobs/list/get-jobs-response", result);
    } catch (error) {
      console.error("[Jobs] Error getting jobs list:", error);
      socket.emit("jobs/list/get-jobs-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Get job details
  const handleGetJobDetails = withRateLimit(async (data) => {
    try {
      console.log("[Jobs] Getting job details:", data);
      const { companyId } = validateAccess(socket);
      const { jobId } = data;
      
      if (!jobId) {
        throw new Error("Job ID is required");
      }

      const result = await getJobDetailsService(jobId, companyId);
      socket.emit("jobs/details/get-job-response", result);
    } catch (error) {
      console.error("[Jobs] Error getting job details:", error);
      socket.emit("jobs/details/get-job-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Create job
  const handleCreateJob = withRateLimit(async (data) => {
    try {
      console.log("[Jobs][CREATE] Incoming payload keys:", Object.keys(data || {}));
      if (data?.image) {
        console.log("[Jobs][CREATE] Image provided, dataURL length:", (data.image || '').length);
        console.log("[Jobs][CREATE] Image meta:", data.imageName, data.imageMime);
      }
      const { companyId, userId } = validateAccess(socket);
      
      const jobData = {
        ...data,
        companyId,
        createdBy: {
          _id: userId,
          firstName: socket.userMetadata?.firstName || "Unknown",
          lastName: socket.userMetadata?.lastName || "User",
          email: socket.userMetadata?.email || "unknown@example.com",
          avatar: socket.userMetadata?.avatar || "assets/img/profiles/avatar-01.jpg"
        }
      };
      console.log("[Jobs][CREATE] Calling service with sanitized jobData (no image logged)");
      const result = await createJobService(jobData);
      console.log("[Jobs][CREATE] Service result:", { done: result?.done, message: result?.message });
      
      if (result.done) {
        // Emit to all users in the company
        io.to(companyId).emit("jobs/job-created", {
          job: result.data,
          createdBy: userId
        });
      }
      
      socket.emit("jobs/create-job-response", result);
    } catch (error) {
      console.error("[Jobs][CREATE] Error:", error);
      socket.emit("jobs/create-job-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Update job
  const handleUpdateJob = withRateLimit(async (data) => {
    try {
      console.log("[Jobs] Updating job:", data);
      const { companyId, userId } = validateAccess(socket);
      const { jobId, ...updateData } = data;
      
      if (!jobId) {
        throw new Error("Job ID is required");
      }

      const jobUpdateData = {
        ...updateData,
        updatedBy: {
          _id: userId,
          firstName: socket.userMetadata?.firstName || "Unknown",
          lastName: socket.userMetadata?.lastName || "User",
          email: socket.userMetadata?.email || "unknown@example.com",
          avatar: socket.userMetadata?.avatar || "assets/img/profiles/avatar-01.jpg"
        }
      };

      const result = await updateJobService(jobId, jobUpdateData, companyId);
      
      if (result.done) {
        // Emit to all users in the company
        io.to(companyId).emit("jobs/job-updated", {
          jobId,
          job: result.data,
          updatedBy: userId
        });
      }
      
      socket.emit("jobs/update-job-response", result);
    } catch (error) {
      console.error("[Jobs] Error updating job:", error);
      socket.emit("jobs/update-job-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Delete job
  const handleDeleteJob = withRateLimit(async (data) => {
    try {
      console.log("[Jobs] Deleting job:", data);
      const { companyId, userId } = validateAccess(socket);
      const { jobId } = data;
      
      if (!jobId) {
        throw new Error("Job ID is required");
      }

      const result = await deleteJobService(jobId, companyId);
      
      if (result.done) {
        // Emit to all users in the company
        io.to(companyId).emit("jobs/job-deleted", {
          jobId,
          deletedBy: userId
        });
      }
      
      socket.emit("jobs/delete-job-response", result);
    } catch (error) {
      console.error("[Jobs] Error deleting job:", error);
      socket.emit("jobs/delete-job-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Bulk delete jobs
  const handleBulkDeleteJobs = withRateLimit(async (data) => {
    try {
      console.log("[Jobs] Bulk deleting jobs:", data);
      const { companyId, userId } = validateAccess(socket);
      const { jobIds } = data;
      
      if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
        throw new Error("Job IDs array is required");
      }

      const result = await bulkDeleteJobsService(jobIds, companyId);
      
      if (result.done) {
        // Emit to all users in the company
        io.to(companyId).emit("jobs/jobs-bulk-deleted", {
          jobIds,
          deletedBy: userId,
          deletedCount: result.deletedCount
        });
      }
      
      socket.emit("jobs/bulk-delete-jobs-response", result);
    } catch (error) {
      console.error("[Jobs] Error bulk deleting jobs:", error);
      socket.emit("jobs/bulk-delete-jobs-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Update job status
  const handleUpdateJobStatus = withRateLimit(async (data) => {
    try {
      console.log("[Jobs] Updating job status:", data);
      const { companyId, userId } = validateAccess(socket);
      const { jobId, status } = data;
      
      if (!jobId || !status) {
        throw new Error("Job ID and status are required");
      }

      const result = await updateJobStatusService(jobId, status, companyId);
      
      if (result.done) {
        // Emit to all users in the company
        io.to(companyId).emit("jobs/job-status-updated", {
          jobId,
          status,
          updatedBy: userId
        });
      }
      
      socket.emit("jobs/update-job-status-response", result);
    } catch (error) {
      console.error("[Jobs] Error updating job status:", error);
      socket.emit("jobs/update-job-status-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Get job categories
  const handleGetJobCategories = withRateLimit(async (data) => {
    try {
      console.log("[Jobs] Getting job categories:", data);
      
      const result = await getJobCategoriesService();
      socket.emit("jobs/get-categories-response", result);
    } catch (error) {
      console.error("[Jobs] Error getting job categories:", error);
      socket.emit("jobs/get-categories-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Get job types
  const handleGetJobTypes = withRateLimit(async (data) => {
    try {
      console.log("[Jobs] Getting job types:", data);
      
      const result = await getJobTypesService();
      socket.emit("jobs/get-types-response", result);
    } catch (error) {
      console.error("[Jobs] Error getting job types:", error);
      socket.emit("jobs/get-types-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Export jobs as PDF
  const handleExportJobsPDF = withRateLimit(async (data) => {
    try {
      console.log("[Jobs] Export PDF request:", data);
      const { companyId, userId } = validateAccess(socket);
      
      const result = await exportJobsPDFService(companyId, userId, data.filters || {});
      
      if (result.done) {
        // Schedule cleanup after 1 hour
        setTimeout(() => {
          try {
            if (result.data.filePath && fs.existsSync(result.data.filePath)) {
              fs.unlinkSync(result.data.filePath);
              console.log("[Jobs] Cleaned up PDF file:", result.data.filePath);
            }
          } catch (cleanupError) {
            console.error("[Jobs] Error cleaning up PDF file:", cleanupError);
          }
        }, 60 * 60 * 1000); // 1 hour
      }
      
      socket.emit("jobs/export-pdf-response", result);
    } catch (error) {
      console.error("[Jobs] Error exporting PDF:", error);
      socket.emit("jobs/export-pdf-response", {
        done: false,
        error: error.message,
      });
    }
  });

  // Export jobs as Excel 
  const handleExportJobsExcel = withRateLimit(async (data) => {
    try {
      console.log("[Jobs] Export Excel request:", data);
      const { companyId, userId } = validateAccess(socket);
      
      const result = await exportJobsExcelService(companyId, userId, data.filters || {});
      
      if (result.done) {
        // Schedule cleanup after 1 hour
        setTimeout(() => {
          try {
            if (result.data.filePath && fs.existsSync(result.data.filePath)) {
              fs.unlinkSync(result.data.filePath);
              console.log("[Jobs] Cleaned up Excel file:", result.data.filePath);
            }
          } catch (cleanupError) {
            console.error("[Jobs] Error cleaning up Excel file:", cleanupError);
          }
        }, 60 * 60 * 1000); // 1 hour
      }
      
      socket.emit("jobs/export-excel-response", result);
    } catch (error) {
      console.error("[Jobs] Error exporting Excel:", error);
      socket.emit("jobs/export-excel-response", {
        done: false,
        error: error.message,
      });
    }
  });

  
  // Socket event listeners
  socket.on("jobs/dashboard/get-stats", handleGetJobsStats);
  socket.on("jobs/list/get-jobs", handleGetJobsList);
  socket.on("jobs/details/get-job", handleGetJobDetails);
  socket.on("jobs/create-job", handleCreateJob);
  socket.on("jobs/update-job", handleUpdateJob);
  socket.on("jobs/delete-job", handleDeleteJob);
  socket.on("jobs/bulk-delete-jobs", handleBulkDeleteJobs);
  socket.on("jobs/update-job-status", handleUpdateJobStatus);
  socket.on("jobs/get-categories", handleGetJobCategories);
  socket.on("jobs/get-types", handleGetJobTypes);
  socket.on("jobs/export-pdf", handleExportJobsPDF);
  socket.on("jobs/export-excel", handleExportJobsExcel);

  console.log("Jobs socket controller setup complete");
};

export default jobsSocketController;
