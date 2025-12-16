import * as performanceIndicatorService from "../../services/performance/performanceIndicator.services.js";

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
export const createPerformanceIndicatorCtrl = async (req, res) => {
  try {
    if (!getRequestUser(req)) return res.status(401).json({ error: "Unauthorized" });
    if (!ensureRole(req, ["admin", "manager"])) return res.status(403).json({ error: "Forbidden" });
    const companyId = validateCompanyAccessHttp(req);
    
    const { designation, department, approvedBy, role } = req.body || {};
    if (!designation) return res.status(400).json({ error: "Designation is required" });
    if (!department) return res.status(400).json({ error: "Department is required" });
    if (!approvedBy) return res.status(400).json({ error: "Approved by is required" });
    if (!role) return res.status(400).json({ error: "Role is required" });
    
    const result = await performanceIndicatorService.createPerformanceIndicator(companyId, req.body || {});
    if (!result.done) return res.status(400).json({ error: result.error || "Failed to create performance indicator" });
    return res.status(201).json(result);
  } catch (error) {
    if (error.message?.includes("Company ID")) return res.status(403).json({ error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllPerformanceIndicatorsCtrl = async (req, res) => {
  try {
    if (!getRequestUser(req)) return res.status(401).json({ error: "Unauthorized" });
    const companyId = validateCompanyAccessHttp(req);
    const filters = {
      status: req.query.status,
      designation: req.query.designation,
      department: req.query.department,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };
    const result = await performanceIndicatorService.getAllPerformanceIndicators(companyId, filters);
    if (!result.done) return res.status(400).json({ error: result.error || "Failed to get performance indicators" });
    return res.status(200).json(result);
  } catch (error) {
    if (error.message?.includes("Company ID")) return res.status(403).json({ error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getPerformanceIndicatorByIdCtrl = async (req, res) => {
  try {
    if (!getRequestUser(req)) return res.status(401).json({ error: "Unauthorized" });
    const companyId = validateCompanyAccessHttp(req);
    const { id } = req.params;
    const result = await performanceIndicatorService.getPerformanceIndicatorById(companyId, id);
    if (!result.done) {
      const status = result.error === "Performance indicator not found" || result.error?.includes("Invalid performance indicator ID") ? 404 : 400;
      return res.status(status).json({ error: result.error || "Failed to get performance indicator" });
    }
    return res.status(200).json(result);
  } catch (error) {
    if (error.message?.includes("Company ID")) return res.status(403).json({ error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updatePerformanceIndicatorCtrl = async (req, res) => {
  try {
    if (!getRequestUser(req)) return res.status(401).json({ error: "Unauthorized" });
    if (!ensureRole(req, ["admin", "manager"])) return res.status(403).json({ error: "Forbidden" });
    const companyId = validateCompanyAccessHttp(req);
    const { id } = req.params;
    const result = await performanceIndicatorService.updatePerformanceIndicator(companyId, id, req.body || {});
    if (!result.done) {
      const status = result.error === "Performance indicator not found" || result.error?.includes("Invalid performance indicator ID") ? 404 : 400;
      return res.status(status).json({ error: result.error || "Failed to update performance indicator" });
    }
    return res.status(200).json(result);
  } catch (error) {
    if (error.message?.includes("Company ID")) return res.status(403).json({ error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const deletePerformanceIndicatorCtrl = async (req, res) => {
  try {
    if (!getRequestUser(req)) return res.status(401).json({ error: "Unauthorized" });
    if (!ensureRole(req, ["admin"])) return res.status(403).json({ error: "Forbidden" });
    const companyId = validateCompanyAccessHttp(req);
    const { id } = req.params;
    const result = await performanceIndicatorService.deletePerformanceIndicator(companyId, id);
    if (!result.done) {
      const status = result.error === "Performance indicator not found" || result.error?.includes("Invalid performance indicator ID") ? 404 : 400;
      return res.status(status).json({ error: result.error || "Failed to delete performance indicator" });
    }
    return res.status(200).json({ done: true, message: "Performance indicator deleted successfully" });
  } catch (error) {
    if (error.message?.includes("Company ID")) return res.status(403).json({ error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ----------------------
// Socket Controller (default export)
// ----------------------
const performanceIndicatorController = (socket, io) => {
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

  socket.on("performanceIndicator:create", async (data) => {
    try {
      if (!isAdminOrManager) throw new Error("Unauthorized: Admins or Managers only");
      const companyId = validateCompanyAccess(socket);
      
      const { designation, department, approvedBy, role } = data || {};
      if (!designation) throw new Error("Designation is required");
      if (!department) throw new Error("Department is required");
      if (!approvedBy) throw new Error("Approved by is required");
      if (!role) throw new Error("Role is required");
      
      const result = await performanceIndicatorService.createPerformanceIndicator(companyId, data || {});
      socket.emit("performanceIndicator:create-response", result);
      if (result.done) io.to(`admin_room_${companyId}`).emit("performanceIndicator:performance-indicator-created", result);
    } catch (error) {
      socket.emit("performanceIndicator:create-response", { done: false, error: error.message });
    }
  });

  socket.on("performanceIndicator:getAll", async (filters = {}) => {
    try {
      const companyId = validateCompanyAccess(socket);
      const result = await performanceIndicatorService.getAllPerformanceIndicators(companyId, filters);
      socket.emit("performanceIndicator:getAll-response", result);
    } catch (error) {
      socket.emit("performanceIndicator:getAll-response", { done: false, error: error.message });
    }
  });

  socket.on("performanceIndicator:getById", async (performanceIndicatorId) => {
    try {
      const companyId = validateCompanyAccess(socket);
      const result = await performanceIndicatorService.getPerformanceIndicatorById(companyId, performanceIndicatorId);
      socket.emit("performanceIndicator:getById-response", result);
    } catch (error) {
      socket.emit("performanceIndicator:getById-response", { done: false, error: error.message });
    }
  });

  socket.on("performanceIndicator:update", async ({ performanceIndicatorId, update }) => {
    try {
      if (!isAdminOrManager) throw new Error("Unauthorized: Admins or Managers only");
      const companyId = validateCompanyAccess(socket);
      const result = await performanceIndicatorService.updatePerformanceIndicator(companyId, performanceIndicatorId, update || {});
      socket.emit("performanceIndicator:update-response", result);
      if (result.done) io.to(`admin_room_${companyId}`).emit("performanceIndicator:performance-indicator-updated", result);
    } catch (error) {
      socket.emit("performanceIndicator:update-response", { done: false, error: error.message });
    }
  });

  socket.on("performanceIndicator:delete", async ({ performanceIndicatorId }) => {
    try {
      if (socket.userMetadata?.role !== "admin") throw new Error("Unauthorized: Admins only");
      const companyId = validateCompanyAccess(socket);
      const result = await performanceIndicatorService.deletePerformanceIndicator(companyId, performanceIndicatorId);
      socket.emit("performanceIndicator:delete-response", result);
      if (result.done) io.to(`admin_room_${companyId}`).emit("performanceIndicator:performance-indicator-deleted", result);
    } catch (error) {
      socket.emit("performanceIndicator:delete-response", { done: false, error: error.message });
    }
  });
};

export default performanceIndicatorController;