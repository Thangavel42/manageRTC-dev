import * as performanceAppraisalService from "../../services/performance/performanceAppraisal.services.js";

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
export const createPerformanceAppraisalCtrl = async (req, res) => {
  try {
    if (!getRequestUser(req)) return res.status(401).json({ error: "Unauthorized" });
    if (!ensureRole(req, ["admin", "manager"])) return res.status(403).json({ error: "Forbidden" });
    const companyId = validateCompanyAccessHttp(req);
    
    const { employeeId, name, designation, department, appraisalDate } = req.body || {};
    if (!employeeId) return res.status(400).json({ error: "Employee ID is required" });
    if (!name) return res.status(400).json({ error: "Employee name is required" });
    if (!designation) return res.status(400).json({ error: "Designation is required" });
    if (!department) return res.status(400).json({ error: "Department is required" });
    if (!appraisalDate) return res.status(400).json({ error: "Appraisal date is required" });
    
    const result = await performanceAppraisalService.createPerformanceAppraisal(companyId, req.body || {});
    if (!result.done) return res.status(400).json({ error: result.error || "Failed to create performance appraisal" });
    return res.status(201).json(result);
  } catch (error) {
    if (error.message?.includes("Company ID")) return res.status(403).json({ error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllPerformanceAppraisalsCtrl = async (req, res) => {
  try {
    if (!getRequestUser(req)) return res.status(401).json({ error: "Unauthorized" });
    const companyId = validateCompanyAccessHttp(req);
    const filters = {
      status: req.query.status,
      employeeId: req.query.employeeId,
      department: req.query.department,
      designation: req.query.designation,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };
    const result = await performanceAppraisalService.getAllPerformanceAppraisals(companyId, filters);
    if (!result.done) return res.status(400).json({ error: result.error || "Failed to get performance appraisals" });
    return res.status(200).json(result);
  } catch (error) {
    if (error.message?.includes("Company ID")) return res.status(403).json({ error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getPerformanceAppraisalByIdCtrl = async (req, res) => {
  try {
    if (!getRequestUser(req)) return res.status(401).json({ error: "Unauthorized" });
    const companyId = validateCompanyAccessHttp(req);
    const { id } = req.params;
    const result = await performanceAppraisalService.getPerformanceAppraisalById(companyId, id);
    if (!result.done) {
      const status = result.error === "Performance appraisal not found" || result.error?.includes("Invalid performance appraisal ID") ? 404 : 400;
      return res.status(status).json({ error: result.error || "Failed to get performance appraisal" });
    }
    return res.status(200).json(result);
  } catch (error) {
    if (error.message?.includes("Company ID")) return res.status(403).json({ error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updatePerformanceAppraisalCtrl = async (req, res) => {
  try {
    if (!getRequestUser(req)) return res.status(401).json({ error: "Unauthorized" });
    if (!ensureRole(req, ["admin", "manager"])) return res.status(403).json({ error: "Forbidden" });
    const companyId = validateCompanyAccessHttp(req);
    const { id } = req.params;
    const result = await performanceAppraisalService.updatePerformanceAppraisal(companyId, id, req.body || {});
    if (!result.done) {
      const status = result.error === "Performance appraisal not found" || result.error?.includes("Invalid performance appraisal ID") ? 404 : 400;
      return res.status(status).json({ error: result.error || "Failed to update performance appraisal" });
    }
    return res.status(200).json(result);
  } catch (error) {
    if (error.message?.includes("Company ID")) return res.status(403).json({ error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const deletePerformanceAppraisalCtrl = async (req, res) => {
  try {
    if (!getRequestUser(req)) return res.status(401).json({ error: "Unauthorized" });
    if (!ensureRole(req, ["admin"])) return res.status(403).json({ error: "Forbidden" });
    const companyId = validateCompanyAccessHttp(req);
    const { id } = req.params;
    const result = await performanceAppraisalService.deletePerformanceAppraisal(companyId, id);
    if (!result.done) {
      const status = result.error === "Performance appraisal not found" || result.error?.includes("Invalid performance appraisal ID") ? 404 : 400;
      return res.status(status).json({ error: result.error || "Failed to delete performance appraisal" });
    }
    return res.status(200).json({ done: true, message: "Performance appraisal deleted successfully" });
  } catch (error) {
    if (error.message?.includes("Company ID")) return res.status(403).json({ error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ----------------------
// Socket Controller (default export)
// ----------------------
const performanceAppraisalController = (socket, io) => {
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

  socket.on("performanceAppraisal:create", async (data) => {
    try {
      if (!isAdminOrManager) throw new Error("Unauthorized: Admins or Managers only");
      const companyId = validateCompanyAccess(socket);
      
      const { employeeId, name, designation, department, appraisalDate } = data || {};
      if (!employeeId) throw new Error("Employee ID is required");
      if (!name) throw new Error("Employee name is required");
      if (!designation) throw new Error("Designation is required");
      if (!department) throw new Error("Department is required");
      if (!appraisalDate) throw new Error("Appraisal date is required");
      
      const result = await performanceAppraisalService.createPerformanceAppraisal(companyId, data || {});
      socket.emit("performanceAppraisal:create-response", result);
      if (result.done) io.to(`admin_room_${companyId}`).emit("performanceAppraisal:performance-appraisal-created", result);
    } catch (error) {
      socket.emit("performanceAppraisal:create-response", { done: false, error: error.message });
    }
  });

  socket.on("performanceAppraisal:getAll", async (filters = {}) => {
    try {
      const companyId = validateCompanyAccess(socket);
      const result = await performanceAppraisalService.getAllPerformanceAppraisals(companyId, filters);
      socket.emit("performanceAppraisal:getAll-response", result);
    } catch (error) {
      socket.emit("performanceAppraisal:getAll-response", { done: false, error: error.message });
    }
  });

  socket.on("performanceAppraisal:getById", async (performanceAppraisalId) => {
    try {
      const companyId = validateCompanyAccess(socket);
      const result = await performanceAppraisalService.getPerformanceAppraisalById(companyId, performanceAppraisalId);
      socket.emit("performanceAppraisal:getById-response", result);
    } catch (error) {
      socket.emit("performanceAppraisal:getById-response", { done: false, error: error.message });
    }
  });

  socket.on("performanceAppraisal:update", async ({ performanceAppraisalId, update }) => {
    try {
      if (!isAdminOrManager) throw new Error("Unauthorized: Admins or Managers only");
      const companyId = validateCompanyAccess(socket);
      const result = await performanceAppraisalService.updatePerformanceAppraisal(companyId, performanceAppraisalId, update || {});
      socket.emit("performanceAppraisal:update-response", result);
      if (result.done) io.to(`admin_room_${companyId}`).emit("performanceAppraisal:performance-appraisal-updated", result);
    } catch (error) {
      socket.emit("performanceAppraisal:update-response", { done: false, error: error.message });
    }
  });

  socket.on("performanceAppraisal:delete", async ({ performanceAppraisalId }) => {
    try {
      if (socket.userMetadata?.role !== "admin") throw new Error("Unauthorized: Admins only");
      const companyId = validateCompanyAccess(socket);
      const result = await performanceAppraisalService.deletePerformanceAppraisal(companyId, performanceAppraisalId);
      socket.emit("performanceAppraisal:delete-response", result);
      if (result.done) io.to(`admin_room_${companyId}`).emit("performanceAppraisal:performance-appraisal-deleted", result);
    } catch (error) {
      socket.emit("performanceAppraisal:delete-response", { done: false, error: error.message });
    }
  });
};

export default performanceAppraisalController;