import * as candidateService from "../../services/candidates/candidates.services.js";
import { devLog, devDebug, devWarn, devError } from '../../utils/logger.js';

const candidateController = (socket, io) => {
  // Helper to validate company access (pattern from admin.controller.js)
  const validateCompanyAccess = (socket) => {
    if (!socket.companyId) {
      devError("[Candidate] Company ID not found in user metadata", { user: socket.user?.sub });
      throw new Error("Company ID not found in user metadata");
    }

    const companyIdRegex = /^[a-zA-Z0-9_-]{3,50}$/;
    if (!companyIdRegex.test(socket.companyId)) {
      devError(`[Candidate] Invalid company ID format: ${socket.companyId}`);
      throw new Error("Invalid company ID format");
    }

    if (socket.userMetadata?.companyId !== socket.companyId) {
      devError(`[Candidate] Company ID mismatch: user metadata has ${socket.userMetadata?.companyId}, socket has ${socket.companyId}`);
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

  // CREATE candidate
  socket.on("candidate:create", async (data) => {
    try {
      devLog("[Candidate] candidate:create event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, data });

      if (!isAuthorizedWrite) throw new Error("Unauthorized: Admin, HR, or superadmin role required");

      const companyId = validateCompanyAccess(socket);

      // Validate required fields
      if (!data.firstName || !data.lastName || !data.email || !data.appliedRole) {
        throw new Error("First name, last name, email, and applied role are required");
      }

      // Always include companyId in the candidate data
      const result = await candidateService.createCandidate(companyId, { ...data, companyId });

      if (!result.done) {
        devError("[Candidate] Failed to create candidate", { error: result.error });
      }

      socket.emit("candidate:create-response", result);

      // Broadcast to admin, HR, and manager rooms to update candidate lists
      io.to(`admin_room_${companyId}`).emit("candidate:candidate-created", result);
      io.to(`hr_room_${companyId}`).emit("candidate:candidate-created", result);
      io.to(`manager_room_${companyId}`).emit("candidate:candidate-created", result);
    } catch (error) {
      devError("[Candidate] Error in candidate:create", { error: error.message });
      socket.emit("candidate:create-response", { done: false, error: error.message });
    }
  });

  // GET all candidates
  socket.on("candidate:getAll", async (filters = {}) => {
    try {
      devLog("[Candidate] candidate:getAll event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, filters });

      // Role check: Only admin, hr, manager, superadmin can access candidates
      if (!isAuthorizedRead) throw new Error("Unauthorized: You do not have permission to access candidates");

      const companyId = validateCompanyAccess(socket);

      const result = await candidateService.getCandidates(companyId, filters);

      if (!result.done) {
        devError("[Candidate] Failed to get candidates", { error: result.error });
      }

      socket.emit("candidate:getAll-response", result);
    } catch (error) {
      devError("[Candidate] Error in candidate:getAll", { error: error.message });
      socket.emit("candidate:getAll-response", { done: false, error: error.message });
    }
  });

  // GET single candidate by ID
  socket.on("candidate:getById", async (candidateId) => {
    try {
      devLog("[Candidate] candidate:getById event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, candidateId });

      // Role check: Only admin, hr, manager, superadmin can access candidates
      if (!isAuthorizedRead) throw new Error("Unauthorized: You do not have permission to access candidates");

      const companyId = validateCompanyAccess(socket);

      const result = await candidateService.getCandidateById(companyId, candidateId);

      if (!result.done) {
        devError("[Candidate] Failed to get candidate", { error: result.error });
      }

      socket.emit("candidate:getById-response", result);
    } catch (error) {
      devError("[Candidate] Error in candidate:getById", { error: error.message });
      socket.emit("candidate:getById-response", { done: false, error: error.message });
    }
  });

  // UPDATE candidate
  socket.on("candidate:update", async (data) => {
    try {
      devLog("[Candidate] candidate:update event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, data });

      if (!isAuthorizedWrite) throw new Error("Unauthorized: Admin, HR, or superadmin role required");

      const companyId = validateCompanyAccess(socket);

      if (!data._id) {
        throw new Error("Candidate ID is required for update");
      }

      const result = await candidateService.updateCandidate(companyId, data._id, data);

      if (!result.done) {
        devError("[Candidate] Failed to update candidate", { error: result.error });
      }

      socket.emit("candidate:update-response", result);

      // Broadcast to admin, HR, and manager rooms to update candidate lists
      io.to(`admin_room_${companyId}`).emit("candidate:candidate-updated", result);
      io.to(`hr_room_${companyId}`).emit("candidate:candidate-updated", result);
      io.to(`manager_room_${companyId}`).emit("candidate:candidate-updated", result);
    } catch (error) {
      devError("[Candidate] Error in candidate:update", { error: error.message });
      socket.emit("candidate:update-response", { done: false, error: error.message });
    }
  });

  // DELETE candidate
  socket.on("candidate:delete", async (candidateId) => {
    try {
      devLog("[Candidate] candidate:delete event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, candidateId });

      if (!isAuthorizedWrite) throw new Error("Unauthorized: Admin, HR, or superadmin role required");

      const companyId = validateCompanyAccess(socket);

      const result = await candidateService.deleteCandidate(companyId, candidateId);

      if (!result.done) {
        devError("[Candidate] Failed to delete candidate", { error: result.error });
      }

      socket.emit("candidate:delete-response", result);

      // Broadcast to admin, HR, and manager rooms to update candidate lists
      io.to(`admin_room_${companyId}`).emit("candidate:candidate-deleted", result);
      io.to(`hr_room_${companyId}`).emit("candidate:candidate-deleted", result);
      io.to(`manager_room_${companyId}`).emit("candidate:candidate-deleted", result);
    } catch (error) {
      devError("[Candidate] Error in candidate:delete", { error: error.message });
      socket.emit("candidate:delete-response", { done: false, error: error.message });
    }
  });

  // UPDATE candidate status
  socket.on("candidate:updateStatus", async (data) => {
    try {
      devLog("[Candidate] candidate:updateStatus event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, data });

      if (!isAuthorizedWrite) throw new Error("Unauthorized: Admin, HR, or superadmin role required");

      const companyId = validateCompanyAccess(socket);

      if (!data.candidateId || !data.status) {
        throw new Error("Candidate ID and status are required");
      }

      const statusData = {
        status: data.status,
        notes: data.notes || `Status updated to ${data.status}`,
        updatedBy: socket.userMetadata?.name || socket.user?.email || 'Unknown'
      };

      const result = await candidateService.updateCandidateStatus(companyId, data.candidateId, statusData);

      if (!result.done) {
        devError("[Candidate] Failed to update candidate status", { error: result.error });
      }

      socket.emit("candidate:updateStatus-response", result);

      // Broadcast to admin, HR, and manager rooms to update candidate lists
      io.to(`admin_room_${companyId}`).emit("candidate:status-updated", result);
      io.to(`hr_room_${companyId}`).emit("candidate:status-updated", result);
      io.to(`manager_room_${companyId}`).emit("candidate:status-updated", result);
    } catch (error) {
      devError("[Candidate] Error in candidate:updateStatus", { error: error.message });
      socket.emit("candidate:updateStatus-response", { done: false, error: error.message });
    }
  });

  // Get all candidate data at once (for dashboard)
  socket.on("candidate:getAllData", async (filters = {}) => {
    try {
      devLog("[Candidate] candidate:getAllData event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, filters });

      // Role check: Only admin, hr, manager, superadmin can access candidates
      if (!isAuthorizedRead) throw new Error("Unauthorized: You do not have permission to access candidates");

      const companyId = validateCompanyAccess(socket);

      const [candidates, stats] = await Promise.all([
        candidateService.getCandidates(companyId, filters),
        candidateService.getCandidateStats(companyId)
      ]);

      const response = {
        done: true,
        data: {
          candidates: candidates.data || [],
          stats: stats.data || {}
        }
      };

      socket.emit("candidate:getAllData-response", response);
    } catch (error) {
      devError("[Candidate] Error in candidate:getAllData", { error: error.message });
      socket.emit("candidate:getAllData-response", { done: false, error: error.message });
    }
  });

  // Get candidate statistics
  socket.on("candidate:getStats", async () => {
    try {
      devLog("[Candidate] candidate:getStats event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId });

      // Role check: Only admin, hr, manager, superadmin can access candidates
      if (!isAuthorizedRead) throw new Error("Unauthorized: You do not have permission to access candidates");

      const companyId = validateCompanyAccess(socket);

      const result = await candidateService.getCandidateStats(companyId);

      socket.emit("candidate:getStats-response", result);
    } catch (error) {
      devError("[Candidate] Error in candidate:getStats", { error: error.message });
      socket.emit("candidate:getStats-response", { done: false, error: error.message });
    }
  });

  // Filter candidates
  socket.on("candidate:filter", async (filters) => {
    try {
      devLog("[Candidate] candidate:filter event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, filters });

      // Role check: Only admin, hr, manager, superadmin can access candidates
      if (!isAuthorizedRead) throw new Error("Unauthorized: You do not have permission to access candidates");

      const companyId = validateCompanyAccess(socket);

      const result = await candidateService.getCandidates(companyId, filters);

      if (!result.done) {
        devError("[Candidate] Failed to filter candidates", { error: result.error });
      }

      socket.emit("candidate:filter-response", result);
    } catch (error) {
      devError("[Candidate] Error in candidate:filter", { error: error.message });
      socket.emit("candidate:filter-response", { done: false, error: error.message });
    }
  });

  // Search candidates
  socket.on("candidate:search", async (searchQuery) => {
    try {
      devLog("[Candidate] candidate:search event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, searchQuery });

      // Role check: Only admin, hr, manager, superadmin can access candidates
      if (!isAuthorizedRead) throw new Error("Unauthorized: You do not have permission to access candidates");

      const companyId = validateCompanyAccess(socket);

      const filters = { search: searchQuery };
      const result = await candidateService.getCandidates(companyId, filters);

      if (!result.done) {
        devError("[Candidate] Failed to search candidates", { error: result.error });
      }

      socket.emit("candidate:search-response", result);
    } catch (error) {
      devError("[Candidate] Error in candidate:search", { error: error.message });
      socket.emit("candidate:search-response", { done: false, error: error.message });
    }
  });

  // Export candidates as PDF
  socket.on("candidate:export-pdf", async () => {
    try {
      devLog("[Candidate] candidate:export-pdf event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId });

      // Role check: Only admin, hr, manager, superadmin can export candidates
      if (!isAuthorizedRead) throw new Error("Unauthorized: You do not have permission to export candidates");

      const companyId = validateCompanyAccess(socket);

      const result = await candidateService.exportCandidatesPDF(companyId);

      socket.emit("candidate:export-pdf-response", result);
    } catch (error) {
      devError("[Candidate] Error in candidate:export-pdf", { error: error.message });
      socket.emit("candidate:export-pdf-response", { done: false, error: error.message });
    }
  });

  // Export candidates as Excel
  socket.on("candidate:export-excel", async () => {
    try {
      devLog("[Candidate] candidate:export-excel event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId });

      // Role check: Only admin, hr, manager, superadmin can export candidates
      if (!isAuthorizedRead) throw new Error("Unauthorized: You do not have permission to export candidates");

      const companyId = validateCompanyAccess(socket);

      const result = await candidateService.exportCandidatesExcel(companyId);

      socket.emit("candidate:export-excel-response", result);
    } catch (error) {
      devError("[Candidate] Error in candidate:export-excel", { error: error.message });
      socket.emit("candidate:export-excel-response", { done: false, error: error.message });
    }
  });

  // Get candidates by status (for Kanban view)
  socket.on("candidate:getByStatus", async (status) => {
    try {
      devLog("[Candidate] candidate:getByStatus event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, status });

      // Role check: Only admin, hr, manager, superadmin can access candidates
      if (!isAuthorizedRead) throw new Error("Unauthorized: You do not have permission to access candidates");

      const companyId = validateCompanyAccess(socket);

      const filters = { status };
      const result = await candidateService.getCandidates(companyId, filters);

      if (!result.done) {
        devError("[Candidate] Failed to get candidates by status", { error: result.error });
      }

      socket.emit("candidate:getByStatus-response", result);
    } catch (error) {
      devError("[Candidate] Error in candidate:getByStatus", { error: error.message });
      socket.emit("candidate:getByStatus-response", { done: false, error: error.message });
    }
  });

  // Bulk operations
  socket.on("candidate:bulkUpdate", async (data) => {
    try {
      devLog("[Candidate] candidate:bulkUpdate event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, data });

      if (!isAuthorizedWrite) throw new Error("Unauthorized: Admin, HR, or superadmin role required");

      const companyId = validateCompanyAccess(socket);

      if (!data.candidateIds || !Array.isArray(data.candidateIds) || data.candidateIds.length === 0) {
        throw new Error("Candidate IDs array is required");
      }

      const results = [];
      for (const candidateId of data.candidateIds) {
        try {
          let result;
          if (data.action === 'updateStatus') {
            const statusData = {
              status: data.status,
              notes: data.notes || `Bulk status update to ${data.status}`,
              updatedBy: socket.userMetadata?.name || socket.user?.email || 'Unknown'
            };
            result = await candidateService.updateCandidateStatus(companyId, candidateId, statusData);
          } else if (data.action === 'delete') {
            result = await candidateService.deleteCandidate(companyId, candidateId);
          } else {
            result = { done: false, error: "Invalid bulk action" };
          }
          results.push({ candidateId, result });
        } catch (error) {
          results.push({ candidateId, result: { done: false, error: error.message } });
        }
      }

      const response = {
        done: true,
        data: {
          results,
          successCount: results.filter(r => r.result.done).length,
          errorCount: results.filter(r => !r.result.done).length
        }
      };

      socket.emit("candidate:bulkUpdate-response", response);

      // Broadcast to admin, HR, and manager rooms to update candidate lists
      io.to(`admin_room_${companyId}`).emit("candidate:bulk-updated", response);
      io.to(`hr_room_${companyId}`).emit("candidate:bulk-updated", response);
      io.to(`manager_room_${companyId}`).emit("candidate:bulk-updated", response);
    } catch (error) {
      devError("[Candidate] Error in candidate:bulkUpdate", { error: error.message });
      socket.emit("candidate:bulkUpdate-response", { done: false, error: error.message });
    }
  });

  // Get candidates by applied role
  socket.on("candidate:getByRole", async (role) => {
    try {
      devLog("[Candidate] candidate:getByRole event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, role });

      // Role check: Only admin, hr, manager, superadmin can access candidates
      if (!isAuthorizedRead) throw new Error("Unauthorized: You do not have permission to access candidates");

      const companyId = validateCompanyAccess(socket);

      const filters = { appliedRole: role };
      const result = await candidateService.getCandidates(companyId, filters);

      if (!result.done) {
        devError("[Candidate] Failed to get candidates by role", { error: result.error });
      }

      socket.emit("candidate:getByRole-response", result);
    } catch (error) {
      devError("[Candidate] Error in candidate:getByRole", { error: error.message });
      socket.emit("candidate:getByRole-response", { done: false, error: error.message });
    }
  });

  // Get candidates by experience level
  socket.on("candidate:getByExperience", async (experienceLevel) => {
    try {
      devLog("[Candidate] candidate:getByExperience event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, experienceLevel });

      // Role check: Only admin, hr, manager, superadmin can access candidates
      if (!isAuthorizedRead) throw new Error("Unauthorized: You do not have permission to access candidates");

      const companyId = validateCompanyAccess(socket);

      const filters = { experienceLevel };
      const result = await candidateService.getCandidates(companyId, filters);

      if (!result.done) {
        devError("[Candidate] Failed to get candidates by experience", { error: result.error });
      }

      socket.emit("candidate:getByExperience-response", result);
    } catch (error) {
      devError("[Candidate] Error in candidate:getByExperience", { error: error.message });
      socket.emit("candidate:getByExperience-response", { done: false, error: error.message });
    }
  });
};

export default candidateController;