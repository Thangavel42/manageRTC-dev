import * as goalTrackingService from "../../services/performance/goalTracking.services.js";

// ----------------------
// Helpers for HTTP layer
// ----------------------
const getRequestUser = (req) => req.user || null;
const getRequestCompanyId = (req) => req.companyId || req.user?.publicMetadata?.companyId || null;

const ensureRole = (req, allowedRoles = []) => {
  const role = req.user?.publicMetadata?.role;
  return allowedRoles.includes(role);
};

const validateCompanyAccessHttp = (req) => {
  const userCompanyId = req.user?.publicMetadata?.companyId;
  const companyId = getRequestCompanyId(req);
  if (!companyId) throw new Error("Company ID not found in user metadata");
  const companyIdRegex = /^[a-zA-Z0-9_-]{3,50}$/;
  if (!companyIdRegex.test(companyId)) throw new Error("Invalid company ID format");
  if (userCompanyId !== companyId) throw new Error("Unauthorized: Company ID mismatch");
  return companyId;
};

// ----------------------
// HTTP Controllers
// ----------------------
export const createGoalTrackingCtrl = async (req, res) => {
  try {
    if (!getRequestUser(req)) return res.status(401).json({ error: "Unauthorized" });
    if (!ensureRole(req, ["admin", "manager"])) return res.status(403).json({ error: "Forbidden" });
    const companyId = validateCompanyAccessHttp(req);
    
    const { goalType, subject, targetAchievement, startDate, endDate } = req.body || {};
    if (!goalType) return res.status(400).json({ error: "Goal type is required" });
    if (!subject) return res.status(400).json({ error: "Subject is required" });
    if (!targetAchievement) return res.status(400).json({ error: "Target achievement is required" });
    if (!startDate) return res.status(400).json({ error: "Start date is required" });
    if (!endDate) return res.status(400).json({ error: "End date is required" });
    
    const result = await goalTrackingService.createGoalTracking(companyId, req.body || {});
    if (!result.done) return res.status(400).json({ error: result.error || "Failed to create goal tracking" });
    return res.status(201).json(result);
  } catch (error) {
    if (error.message?.includes("Company ID")) return res.status(403).json({ error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllGoalTrackingsCtrl = async (req, res) => {
  try {
    if (!getRequestUser(req)) return res.status(401).json({ error: "Unauthorized" });
    const companyId = validateCompanyAccessHttp(req);
    const filters = {
      status: req.query.status,
      goalType: req.query.goalType,
      assignedTo: req.query.assignedTo,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };
    const result = await goalTrackingService.getAllGoalTrackings(companyId, filters);
    if (!result.done) return res.status(400).json({ error: result.error || "Failed to get goal trackings" });
    return res.status(200).json(result);
  } catch (error) {
    if (error.message?.includes("Company ID")) return res.status(403).json({ error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getGoalTrackingByIdCtrl = async (req, res) => {
  try {
    if (!getRequestUser(req)) return res.status(401).json({ error: "Unauthorized" });
    const companyId = validateCompanyAccessHttp(req);
    const { id } = req.params;
    const result = await goalTrackingService.getGoalTrackingById(companyId, id);
    if (!result.done) {
      const status = result.error === "Goal tracking not found" || result.error?.includes("Invalid goal tracking ID") ? 404 : 400;
      return res.status(status).json({ error: result.error || "Failed to get goal tracking" });
    }
    return res.status(200).json(result);
  } catch (error) {
    if (error.message?.includes("Company ID")) return res.status(403).json({ error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updateGoalTrackingCtrl = async (req, res) => {
  try {
    if (!getRequestUser(req)) return res.status(401).json({ error: "Unauthorized" });
    if (!ensureRole(req, ["admin", "manager"])) return res.status(403).json({ error: "Forbidden" });
    const companyId = validateCompanyAccessHttp(req);
    const { id } = req.params;
    const result = await goalTrackingService.updateGoalTracking(companyId, id, req.body || {});
    if (!result.done) {
      const status = result.error === "Goal tracking not found" || result.error?.includes("Invalid goal tracking ID") ? 404 : 400;
      return res.status(status).json({ error: result.error || "Failed to update goal tracking" });
    }
    return res.status(200).json(result);
  } catch (error) {
    if (error.message?.includes("Company ID")) return res.status(403).json({ error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteGoalTrackingCtrl = async (req, res) => {
  try {
    if (!getRequestUser(req)) return res.status(401).json({ error: "Unauthorized" });
    if (!ensureRole(req, ["admin"])) return res.status(403).json({ error: "Forbidden" });
    const companyId = validateCompanyAccessHttp(req);
    const { id } = req.params;
    const result = await goalTrackingService.deleteGoalTracking(companyId, id);
    if (!result.done) {
      const status = result.error === "Goal tracking not found" || result.error?.includes("Invalid goal tracking ID") ? 404 : 400;
      return res.status(status).json({ error: result.error || "Failed to delete goal tracking" });
    }
    return res.status(200).json({ done: true, message: "Goal tracking deleted successfully" });
  } catch (error) {
    if (error.message?.includes("Company ID")) return res.status(403).json({ error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ----------------------
// Socket Controller (default export)
// ----------------------
const goalTrackingController = (socket, io) => {
  const validateCompanyAccess = (socket) => {
    if (!socket.companyId) {
      throw new Error("Company ID not found in user metadata");
    }
    const companyIdRegex = /^[a-zA-Z0-9_-]{3,50}$/;
    if (!companyIdRegex.test(socket.companyId)) {
      throw new Error("Invalid company ID format");
    }
    if (socket.userMetadata?.companyId !== socket.companyId) {
      throw new Error("Unauthorized: Company ID mismatch");
    }
    return socket.companyId;
  };

  const isAdminOrManager = ["admin", "manager"].includes(socket.userMetadata?.role);

  socket.on("goalTracking:create", async (data) => {
    try {
      if (!isAdminOrManager) throw new Error("Unauthorized: Admins or Managers only");
      const companyId = validateCompanyAccess(socket);
      
      const { goalType, subject, targetAchievement, startDate, endDate } = data || {};
      if (!goalType) throw new Error("Goal type is required");
      if (!subject) throw new Error("Subject is required");
      if (!targetAchievement) throw new Error("Target achievement is required");
      if (!startDate) throw new Error("Start date is required");
      if (!endDate) throw new Error("End date is required");
      
      const result = await goalTrackingService.createGoalTracking(companyId, data || {});
      socket.emit("goalTracking:create-response", result);
      if (result.done) io.to(`admin_room_${companyId}`).emit("goalTracking:goal-tracking-created", result);
    } catch (error) {
      socket.emit("goalTracking:create-response", { done: false, error: error.message });
    }
  });

  socket.on("goalTracking:getAll", async (filters = {}) => {
    try {
      const companyId = validateCompanyAccess(socket);
      const result = await goalTrackingService.getAllGoalTrackings(companyId, filters);
      socket.emit("goalTracking:getAll-response", result);
    } catch (error) {
      socket.emit("goalTracking:getAll-response", { done: false, error: error.message });
    }
  });

  socket.on("goalTracking:getById", async (goalTrackingId) => {
    try {
      const companyId = validateCompanyAccess(socket);
      const result = await goalTrackingService.getGoalTrackingById(companyId, goalTrackingId);
      socket.emit("goalTracking:getById-response", result);
    } catch (error) {
      socket.emit("goalTracking:getById-response", { done: false, error: error.message });
    }
  });

  socket.on("goalTracking:update", async ({ goalTrackingId, update }) => {
    try {
      if (!isAdminOrManager) throw new Error("Unauthorized: Admins or Managers only");
      const companyId = validateCompanyAccess(socket);
      const result = await goalTrackingService.updateGoalTracking(companyId, goalTrackingId, update || {});
      socket.emit("goalTracking:update-response", result);
      if (result.done) io.to(`admin_room_${companyId}`).emit("goalTracking:goal-tracking-updated", result);
    } catch (error) {
      socket.emit("goalTracking:update-response", { done: false, error: error.message });
    }
  });

  socket.on("goalTracking:delete", async ({ goalTrackingId }) => {
    try {
      if (socket.userMetadata?.role !== "admin") throw new Error("Unauthorized: Admins only");
      const companyId = validateCompanyAccess(socket);
      const result = await goalTrackingService.deleteGoalTracking(companyId, goalTrackingId);
      socket.emit("goalTracking:delete-response", result);
      if (result.done) io.to(`admin_room_${companyId}`).emit("goalTracking:goal-tracking-deleted", result);
    } catch (error) {
      socket.emit("goalTracking:delete-response", { done: false, error: error.message });
    }
  });
};

export default goalTrackingController;
