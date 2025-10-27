import * as goalTypeService from "../../services/performance/goalType.services.js";

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
export const createGoalTypeCtrl = async (req, res) => {
  try {
    if (!getRequestUser(req)) return res.status(401).json({ error: "Unauthorized" });
    if (!ensureRole(req, ["admin", "manager"])) return res.status(403).json({ error: "Forbidden" });
    const companyId = validateCompanyAccessHttp(req);
    
    const { type } = req.body || {};
    if (!type) return res.status(400).json({ error: "Goal type is required" });
    
    const result = await goalTypeService.createGoalType(companyId, req.body || {});
    if (!result.done) return res.status(400).json({ error: result.error || "Failed to create goal type" });
    return res.status(201).json(result);
  } catch (error) {
    if (error.message?.includes("Company ID")) return res.status(403).json({ error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllGoalTypesCtrl = async (req, res) => {
  try {
    if (!getRequestUser(req)) return res.status(401).json({ error: "Unauthorized" });
    const companyId = validateCompanyAccessHttp(req);
    const filters = {
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };
    const result = await goalTypeService.getAllGoalTypes(companyId, filters);
    if (!result.done) return res.status(400).json({ error: result.error || "Failed to get goal types" });
    return res.status(200).json(result);
  } catch (error) {
    if (error.message?.includes("Company ID")) return res.status(403).json({ error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getGoalTypeByIdCtrl = async (req, res) => {
  try {
    if (!getRequestUser(req)) return res.status(401).json({ error: "Unauthorized" });
    const companyId = validateCompanyAccessHttp(req);
    const { id } = req.params;
    const result = await goalTypeService.getGoalTypeById(companyId, id);
    if (!result.done) {
      const status = result.error === "Goal type not found" || result.error?.includes("Invalid goal type ID") ? 404 : 400;
      return res.status(status).json({ error: result.error || "Failed to get goal type" });
    }
    return res.status(200).json(result);
  } catch (error) {
    if (error.message?.includes("Company ID")) return res.status(403).json({ error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updateGoalTypeCtrl = async (req, res) => {
  try {
    if (!getRequestUser(req)) return res.status(401).json({ error: "Unauthorized" });
    if (!ensureRole(req, ["admin", "manager"])) return res.status(403).json({ error: "Forbidden" });
    const companyId = validateCompanyAccessHttp(req);
    const { id } = req.params;
    const result = await goalTypeService.updateGoalType(companyId, id, req.body || {});
    if (!result.done) {
      const status = result.error === "Goal type not found" || result.error?.includes("Invalid goal type ID") ? 404 : 400;
      return res.status(status).json({ error: result.error || "Failed to update goal type" });
    }
    return res.status(200).json(result);
  } catch (error) {
    if (error.message?.includes("Company ID")) return res.status(403).json({ error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteGoalTypeCtrl = async (req, res) => {
  try {
    if (!getRequestUser(req)) return res.status(401).json({ error: "Unauthorized" });
    if (!ensureRole(req, ["admin"])) return res.status(403).json({ error: "Forbidden" });
    const companyId = validateCompanyAccessHttp(req);
    const { id } = req.params;
    const result = await goalTypeService.deleteGoalType(companyId, id);
    if (!result.done) {
      const status = result.error === "Goal type not found" || result.error?.includes("Invalid goal type ID") ? 404 : 400;
      return res.status(status).json({ error: result.error || "Failed to delete goal type" });
    }
    return res.status(200).json({ done: true, message: "Goal type deleted successfully" });
  } catch (error) {
    if (error.message?.includes("Company ID")) return res.status(403).json({ error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ----------------------
// Socket Controller (default export)
// ----------------------
const goalTypeController = (socket, io) => {
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

  socket.on("goalType:create", async (data) => {
    try {
      if (!isAdminOrManager) throw new Error("Unauthorized: Admins or Managers only");
      const companyId = validateCompanyAccess(socket);
      
      const { type, description } = data || {};
      if (!type) throw new Error("Goal type is required");
      if (!description) throw new Error("Description is required");
      
      const result = await goalTypeService.createGoalType(companyId, data || {});
      socket.emit("goalType:create-response", result);
      if (result.done) io.to(`admin_room_${companyId}`).emit("goalType:goal-type-created", result);
    } catch (error) {
      socket.emit("goalType:create-response", { done: false, error: error.message });
    }
  });

  socket.on("goalType:getAll", async (filters = {}) => {
    try {
      const companyId = validateCompanyAccess(socket);
      const result = await goalTypeService.getAllGoalTypes(companyId, filters);
      socket.emit("goalType:getAll-response", result);
    } catch (error) {
      socket.emit("goalType:getAll-response", { done: false, error: error.message });
    }
  });

  socket.on("goalType:getById", async (goalTypeId) => {
    try {
      const companyId = validateCompanyAccess(socket);
      const result = await goalTypeService.getGoalTypeById(companyId, goalTypeId);
      socket.emit("goalType:getById-response", result);
    } catch (error) {
      socket.emit("goalType:getById-response", { done: false, error: error.message });
    }
  });

  socket.on("goalType:update", async ({ goalTypeId, update }) => {
    try {
      if (!isAdminOrManager) throw new Error("Unauthorized: Admins or Managers only");
      const companyId = validateCompanyAccess(socket);
      const result = await goalTypeService.updateGoalType(companyId, goalTypeId, update || {});
      socket.emit("goalType:update-response", result);
      if (result.done) io.to(`admin_room_${companyId}`).emit("goalType:goal-type-updated", result);
    } catch (error) {
      socket.emit("goalType:update-response", { done: false, error: error.message });
    }
  });

  socket.on("goalType:delete", async ({ goalTypeId }) => {
    try {
      if (socket.userMetadata?.role !== "admin") throw new Error("Unauthorized: Admins only");
      const companyId = validateCompanyAccess(socket);
      const result = await goalTypeService.deleteGoalType(companyId, goalTypeId);
      socket.emit("goalType:delete-response", result);
      if (result.done) io.to(`admin_room_${companyId}`).emit("goalType:goal-type-deleted", result);
    } catch (error) {
      socket.emit("goalType:delete-response", { done: false, error: error.message });
    }
  });
};

export default goalTypeController;
