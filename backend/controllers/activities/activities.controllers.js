import * as activityService from "../../services/activities/activities.services.js";
import { devLog, devDebug, devWarn, devError } from '../../utils/logger.js';

const activityController = (socket, io) => {
  // Helper to validate company access (pattern from admin.controller.js)
  const validateCompanyAccess = (socket) => {
    if (!socket.companyId) {
      devError("[Activity] Company ID not found in user metadata", { user: socket.user?.sub });
      throw new Error("Company ID not found in user metadata");
    }
    const companyIdRegex = /^[a-zA-Z0-9_-]{3,50}$/;
    if (!companyIdRegex.test(socket.companyId)) {
      devError(`[Activity] Invalid company ID format: ${socket.companyId}`);
      throw new Error("Invalid company ID format");
    }
    if (socket.userMetadata?.companyId !== socket.companyId) {
      devError(`[Activity] Company ID mismatch: user metadata has ${socket.userMetadata?.companyId}, socket has ${socket.companyId}`);
      throw new Error("Unauthorized: Company ID mismatch");
    }
    return socket.companyId;
  };

  // Only allow admin (case-insensitive)
  const isAdmin = socket.userMetadata?.role?.toLowerCase() === "admin";

  // CREATE activity
  socket.on("activity:create", async (data) => {
    try {
      devLog("[Activity] activity:create event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, data });
      if (!isAdmin) throw new Error("Unauthorized: Admins only");
      const companyId = validateCompanyAccess(socket);

      // Validate required fields
      if (!data.title || !data.activityType || !data.dueDate) {
        throw new Error("Title, activity type, and due date are required");
      }

      // Always include companyId in the activity data
      const result = await activityService.createActivity(companyId, { ...data, companyId });
      if (!result.done) {
        devError("[Activity] Failed to create activity", { error: result.error });
      }
      socket.emit("activity:create-response", result);

      // Broadcast to admin room to update activity lists
      io.to(`admin_room_${companyId}`).emit("activity:activity-created", result);
    } catch (error) {
      devError("[Activity] Error in activity:create", { error: error.message });
      socket.emit("activity:create-response", { done: false, error: error.message });
    }
  });

  // GET all activities
  socket.on("activity:getAll", async (filters = {}) => {
    try {
      devLog("[Activity] activity:getAll event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, filters });
      const companyId = validateCompanyAccess(socket);
      const result = await activityService.getActivities(companyId, filters);
      if (!result.done) {
        devError("[Activity] Failed to get activities", { error: result.error });
      }
      socket.emit("activity:getAll-response", result);
    } catch (error) {
      devError("[Activity] Error in activity:getAll", { error: error.message });
      socket.emit("activity:getAll-response", { done: false, error: error.message });
    }
  });

  // GET single activity by ID
  socket.on("activity:getById", async (activityId) => {
    try {
      devLog("[Activity] activity:getById event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, activityId });
      const companyId = validateCompanyAccess(socket);
      const result = await activityService.getActivityById(companyId, activityId);
      if (!result.done) {
        devError("[Activity] Failed to get activity", { error: result.error });
      }
      socket.emit("activity:getById-response", result);
    } catch (error) {
      devError("[Activity] Error in activity:getById", { error: error.message });
      socket.emit("activity:getById-response", { done: false, error: error.message });
    }
  });

  // UPDATE activity
  socket.on("activity:update", async ({ activityId, update }) => {
    try {
      devLog("[Activity] activity:update event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, activityId, update });
      if (!isAdmin) throw new Error("Unauthorized: Admins only");
      const companyId = validateCompanyAccess(socket);
      const result = await activityService.updateActivity(companyId, activityId, update);
      if (!result.done) {
        devError("[Activity] Failed to update activity", { error: result.error });
      }
      socket.emit("activity:update-response", result);
      
      // Broadcast to admin room to update activity lists
      io.to(`admin_room_${companyId}`).emit("activity:activity-updated", result);
    } catch (error) {
      devError("[Activity] Error in activity:update", { error: error.message });
      socket.emit("activity:update-response", { done: false, error: error.message });
    }
  });

  // DELETE activity
  socket.on("activity:delete", async ({ activityId }) => {
    try {
      devLog("[Activity] activity:delete event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, activityId });
      if (!isAdmin) throw new Error("Unauthorized: Admins only");
      const companyId = validateCompanyAccess(socket);
      const result = await activityService.deleteActivity(companyId, activityId);
      if (!result.done) {
        devError("[Activity] Failed to delete activity", { error: result.error });
      }
      socket.emit("activity:delete-response", result);
      
      // Broadcast to admin room to update activity lists
      io.to(`admin_room_${companyId}`).emit("activity:activity-deleted", result);
    } catch (error) {
      devError("[Activity] Error in activity:delete", { error: error.message });
      socket.emit("activity:delete-response", { done: false, error: error.message });
    }
  });

  // GET activity statistics
  socket.on("activity:getStats", async () => {
    try {
      devLog("[Activity] activity:getStats event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId });
      const companyId = validateCompanyAccess(socket);
      const result = await activityService.getActivityStats(companyId);
      if (!result.done) {
        devError("[Activity] Failed to get activity stats", { error: result.error });
      }
      socket.emit("activity:getStats-response", result);
    } catch (error) {
      devError("[Activity] Error in activity:getStats", { error: error.message });
      socket.emit("activity:getStats-response", { done: false, error: error.message });
    }
  });

  // GET activity owners (for filter dropdown)
  socket.on("activity:getOwners", async () => {
    try {
      devLog("[Activity] activity:getOwners event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId });
      const companyId = validateCompanyAccess(socket);
      const result = await activityService.getActivityOwners(companyId);
      if (!result.done) {
        devError("[Activity] Failed to get activity owners", { error: result.error });
      }
      socket.emit("activity:getOwners-response", result);
    } catch (error) {
      devError("[Activity] Error in activity:getOwners", { error: error.message });
      socket.emit("activity:getOwners-response", { done: false, error: error.message });
    }
  });

  // Export activities as PDF
  socket.on("activity/export-pdf", async () => {
    try {
      devLog("Received activity export-pdf request");
      
      if (!socket.companyId) {
        throw new Error("Company ID not found in user metadata");
      }

      devLog("Generating PDF...");
      const result = await activityService.exportActivitiesPDF(socket.companyId);
      devLog("PDF generation result:", result);
      
      if (result.done) {
        devLog("Sending PDF URL to client:", result.data.pdfUrl);
        socket.emit("activity/export-pdf-response", {
          done: true,
          data: {
            pdfUrl: result.data.pdfUrl
          }
        });
        
        // Schedule cleanup after 1 hour
        setTimeout(() => {
          devLog("Cleaning up PDF file:", result.data.pdfPath);
          // Note: We could add a cleanup function similar to subscriptions if needed
        }, 60 * 60 * 1000);
      } else {
        devError("PDF generation failed:", result.error);
        socket.emit("activity/export-pdf-response", {
          done: false,
          error: result.error
        });
      }
    } catch (error) {
      devError("Error in activity export-pdf handler:", error);
      socket.emit("activity/export-pdf-response", {
        done: false,
        error: error.message
      });
    }
  });

  // Export activities as Excel
  socket.on("activity/export-excel", async () => {
    try {
      devLog("Received activity export-excel request");
      
      if (!socket.companyId) {
        throw new Error("Company ID not found in user metadata");
      }

      devLog("Generating Excel...");
      const result = await activityService.exportActivitiesExcel(socket.companyId);
      devLog("Excel generation result:", result);
      
      if (result.done) {
        devLog("Sending Excel URL to client:", result.data.excelUrl);
        socket.emit("activity/export-excel-response", {
          done: true,
          data: {
            excelUrl: result.data.excelUrl
          }
        });
        
        // Schedule cleanup after 1 hour
        setTimeout(() => {
          devLog("Cleaning up Excel file:", result.data.excelPath);
          // Note: We could add a cleanup function similar to subscriptions if needed
        }, 60 * 60 * 1000);
      } else {
        devError("Excel generation failed:", result.error);
        socket.emit("activity/export-excel-response", {
          done: false,
          error: result.error
        });
      }
    } catch (error) {
      devError("Error in activity export-excel handler:", error);
      socket.emit("activity/export-excel-response", {
        done: false,
        error: error.message
      });
    }
  });

  // Get all activity data at once (for dashboard)
  socket.on("activity:getAllData", async (filters = {}) => {
    try {
      devLog("[Activity] activity:getAllData event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, filters });
      const companyId = validateCompanyAccess(socket);
      
      const [activities, stats, owners] = await Promise.all([
        activityService.getActivities(companyId, filters),
        activityService.getActivityStats(companyId),
        activityService.getActivityOwners(companyId)
      ]);
      
      socket.emit("activity:getAllData-response", {
        done: true,
        data: {
          activities: activities.data || [],
          stats: stats.data || {},
          owners: owners.data || []
        }
      });
    } catch (error) {
      devError("[Activity] Error in activity:getAllData", { error: error.message });
      socket.emit("activity:getAllData-response", { done: false, error: error.message });
    }
  });
};

export default activityController;