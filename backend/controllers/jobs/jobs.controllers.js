import * as jobsService from "../../services/jobs/jobs.services.js";
import { devLog, devDebug, devWarn, devError } from '../../utils/logger.js';

const jobsController = (socket, io) => {
  // Helper to validate company access (pattern from admin.controller.js)
  const validateCompanyAccess = (socket) => {
    if (!socket.companyId) {
      devError("[Jobs] Company ID not found in user metadata", { user: socket.user?.sub });
      throw new Error("Company ID not found in user metadata");
    }

    const companyIdRegex = /^[a-zA-Z0-9_-]{3,50}$/;
    if (!companyIdRegex.test(socket.companyId)) {
      devError(`[Jobs] Invalid company ID format: ${socket.companyId}`);
      throw new Error("Invalid company ID format");
    }

    if (socket.userMetadata?.companyId !== socket.companyId) {
      devError(`[Jobs] Company ID mismatch: user metadata has ${socket.userMetadata?.companyId}, socket has ${socket.companyId}`);
      throw new Error("Unauthorized: Company ID mismatch");
    }

    return socket.companyId;
  };

  // Check role permissions (case-insensitive)
  const userRole = socket.userMetadata?.role?.toLowerCase();
  const isAdmin = userRole === "admin";
  const isHR = userRole === "hr";
  const isManager = userRole === "manager";
  const isSuperadmin = userRole === "superadmin";
  // For read operations: admin, hr, manager, superadmin
  const isAuthorizedRead = isAdmin || isHR || isManager || isSuperadmin;
  // For write/delete operations: admin, hr, superadmin
  const isAuthorizedWrite = isAdmin || isHR || isSuperadmin;

  // Create job - admin only
  socket.on("job:create", async (data) => {
    try {
      devLog("[Jobs] job:create event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, data });
      if (!isAuthorizedWrite) throw new Error("Unauthorized: Only admin, HR, or superadmin can create jobs");

      const companyId = validateCompanyAccess(socket);

      // Validate required fields
      if (!data.title || !data.category || !data.type) {
        throw new Error("Missing required fields: title, category, type");
      }

      // Always include companyId in the job data
      const result = await jobsService.createJob(companyId, { ...data, companyId });

      if (!result.done) {
        throw new Error(result.error);
      }

      socket.emit("job:create-response", result);

      // Broadcast to admin, HR, and manager rooms to update job lists
      io.to(`admin_room_${companyId}`).emit("job:job-created", result);
      io.to(`hr_room_${companyId}`).emit("job:job-created", result);
      io.to(`manager_room_${companyId}`).emit("job:job-created", result);

    } catch (error) {
      devError("[Jobs] Error in job:create", { error: error.message });
      socket.emit("job:create-response", { done: false, error: error.message });
    }
  });

  // Get all jobs - admin and HR
  socket.on("job:getAll", async (filters = {}) => {
    try {
      devLog("[Jobs] job:getAll event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, filters });
      if (!isAuthorizedRead) throw new Error("Unauthorized access");

      const companyId = validateCompanyAccess(socket);
      const result = await jobsService.getJobs(companyId, filters);

      if (!result.done) {
        throw new Error(result.error);
      }

      socket.emit("job:getAll-response", result);

    } catch (error) {
      devError("[Jobs] Error in job:getAll", { error: error.message });
      socket.emit("job:getAll-response", { done: false, error: error.message });
    }
  });

  // Get all job data at once (for dashboard) - admin and HR
  socket.on("job:getAllData", async (filters = {}) => {
    try {
      devLog("[Jobs] job:getAllData event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, filters });
      if (!isAuthorizedRead) throw new Error("Unauthorized access");

      const companyId = validateCompanyAccess(socket);

      const [jobs, stats] = await Promise.all([
        jobsService.getJobs(companyId, filters),
        jobsService.getJobStats(companyId)
      ]);

      const response = {
        done: true,
        data: {
          jobs: jobs.data || [],
          stats: stats.data || {}
        }
      };

      socket.emit("job:getAllData-response", response);

    } catch (error) {
      devError("[Jobs] Error in job:getAllData", { error: error.message });
      socket.emit("job:getAllData-response", { done: false, error: error.message });
    }
  });

  // Get single job by ID - admin and HR
  socket.on("job:getById", async (jobId) => {
    try {
      devLog("[Jobs] job:getById event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, jobId });
      if (!isAuthorizedRead) throw new Error("Unauthorized access");

      const companyId = validateCompanyAccess(socket);
      const result = await jobsService.getJobById(companyId, jobId);

      if (!result.done) {
        throw new Error(result.error);
      }

      socket.emit("job:getById-response", result);

    } catch (error) {
      devError("[Jobs] Error in job:getById", { error: error.message });
      socket.emit("job:getById-response", { done: false, error: error.message });
    }
  });

  // Update job - admin only
  socket.on("job:update", async (data) => {
    try {
      devLog("[Jobs] job:update event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, data });
      if (!isAuthorizedWrite) throw new Error("Unauthorized: Only admin, HR, or superadmin can update jobs");

      const companyId = validateCompanyAccess(socket);

      if (!data._id) {
        throw new Error("Job ID is required for update");
      }

      const result = await jobsService.updateJob(companyId, data._id, data);

      if (!result.done) {
        throw new Error(result.error);
      }

      socket.emit("job:update-response", result);

      // Broadcast to admin, HR, and manager rooms to update job lists
      io.to(`admin_room_${companyId}`).emit("job:job-updated", result);
      io.to(`hr_room_${companyId}`).emit("job:job-updated", result);
      io.to(`manager_room_${companyId}`).emit("job:job-updated", result);

    } catch (error) {
      devError("[Jobs] Error in job:update", { error: error.message });
      socket.emit("job:update-response", { done: false, error: error.message });
    }
  });

  // Delete job - admin only
  socket.on("job:delete", async (jobId) => {
    try {
      devLog("[Jobs] job:delete event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, jobId });
      if (!isAuthorizedWrite) throw new Error("Unauthorized: Only admin, HR, or superadmin can delete jobs");

      const companyId = validateCompanyAccess(socket);
      const result = await jobsService.deleteJob(companyId, jobId);

      if (!result.done) {
        throw new Error(result.error);
      }

      socket.emit("job:delete-response", result);

      // Broadcast to admin, HR, and manager rooms to update job lists
      io.to(`admin_room_${companyId}`).emit("job:job-deleted", result);
      io.to(`hr_room_${companyId}`).emit("job:job-deleted", result);
      io.to(`manager_room_${companyId}`).emit("job:job-deleted", result);

    } catch (error) {
      devError("[Jobs] Error in job:delete", { error: error.message });
      socket.emit("job:delete-response", { done: false, error: error.message });
    }
  });

  // Get job statistics - admin and HR
  socket.on("job:getStats", async () => {
    try {
      devLog("[Jobs] job:getStats event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId });
      if (!isAuthorizedRead) throw new Error("Unauthorized access");

      const companyId = validateCompanyAccess(socket);
      const result = await jobsService.getJobStats(companyId);

      if (!result.done) {
        throw new Error(result.error);
      }

      socket.emit("job:getStats-response", result);

    } catch (error) {
      devError("[Jobs] Error in job:getStats", { error: error.message });
      socket.emit("job:getStats-response", { done: false, error: error.message });
    }
  });

  // Export jobs as PDF - admin and HR
  socket.on("job:export-pdf", async () => {
    try {
      devLog("[Jobs] job:export-pdf event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId });
      if (!isAuthorizedRead) throw new Error("Unauthorized access");

      const companyId = validateCompanyAccess(socket);
      const result = await jobsService.exportJobsPDF(companyId);

      if (!result.done) {
        throw new Error(result.error);
      }

      socket.emit("job:export-pdf-response", result);

    } catch (error) {
      devError("[Jobs] Error in job:export-pdf", { error: error.message });
      socket.emit("job:export-pdf-response", { done: false, error: error.message });
    }
  });

  // Export jobs as Excel - admin and HR
  socket.on("job:export-excel", async () => {
    try {
      devLog("[Jobs] job:export-excel event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId });
      if (!isAuthorizedRead) throw new Error("Unauthorized access");

      const companyId = validateCompanyAccess(socket);
      const result = await jobsService.exportJobsExcel(companyId);

      if (!result.done) {
        throw new Error(result.error);
      }

      socket.emit("job:export-excel-response", result);

    } catch (error) {
      devError("[Jobs] Error in job:export-excel", { error: error.message });
      socket.emit("job:export-excel-response", { done: false, error: error.message });
    }
  });
};

export default jobsController;