import * as performanceReviewService from "../../services/performance/performanceReview.services.js";

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
export const createPerformanceReviewCtrl = async (req, res) => {
  try {
    if (!getRequestUser(req)) return res.status(401).json({ error: "Unauthorized" });
    if (!ensureRole(req, ["admin", "manager"])) return res.status(403).json({ error: "Forbidden" });
    const companyId = validateCompanyAccessHttp(req);
    
    const { employeeId, employeeInfo } = req.body || {};
    if (!employeeId) return res.status(400).json({ error: "Employee ID is required" });
    if (!employeeInfo?.name) return res.status(400).json({ error: "Employee name is required" });
    if (!employeeInfo?.empId) return res.status(400).json({ error: "Employee ID is required" });
    if (!employeeInfo?.department) return res.status(400).json({ error: "Department is required" });
    if (!employeeInfo?.designation) return res.status(400).json({ error: "Designation is required" });
    
    const result = await performanceReviewService.createPerformanceReview(companyId, req.body || {});
    if (!result.done) return res.status(400).json({ error: result.error || "Failed to create performance review" });
    return res.status(201).json(result);
  } catch (error) {
    if (error.message?.includes("Company ID")) return res.status(403).json({ error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllPerformanceReviewsCtrl = async (req, res) => {
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
    const result = await performanceReviewService.getAllPerformanceReviews(companyId, filters);
    if (!result.done) return res.status(400).json({ error: result.error || "Failed to get performance reviews" });
    return res.status(200).json(result);
  } catch (error) {
    if (error.message?.includes("Company ID")) return res.status(403).json({ error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getPerformanceReviewByIdCtrl = async (req, res) => {
  try {
    if (!getRequestUser(req)) return res.status(401).json({ error: "Unauthorized" });
    const companyId = validateCompanyAccessHttp(req);
    const { id } = req.params;
    const result = await performanceReviewService.getPerformanceReviewById(companyId, id);
    if (!result.done) {
      const status = result.error === "Performance review not found" || result.error?.includes("Invalid performance review ID") ? 404 : 400;
      return res.status(status).json({ error: result.error || "Failed to get performance review" });
    }
    return res.status(200).json(result);
  } catch (error) {
    if (error.message?.includes("Company ID")) return res.status(403).json({ error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updatePerformanceReviewCtrl = async (req, res) => {
  try {
    if (!getRequestUser(req)) return res.status(401).json({ error: "Unauthorized" });
    if (!ensureRole(req, ["admin", "manager"])) return res.status(403).json({ error: "Forbidden" });
    const companyId = validateCompanyAccessHttp(req);
    const { id } = req.params;
    const result = await performanceReviewService.updatePerformanceReview(companyId, id, req.body || {});
    if (!result.done) {
      const status = result.error === "Performance review not found" || result.error?.includes("Invalid performance review ID") ? 404 : 400;
      return res.status(status).json({ error: result.error || "Failed to update performance review" });
    }
    return res.status(200).json(result);
  } catch (error) {
    if (error.message?.includes("Company ID")) return res.status(403).json({ error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const deletePerformanceReviewCtrl = async (req, res) => {
  try {
    if (!getRequestUser(req)) return res.status(401).json({ error: "Unauthorized" });
    if (!ensureRole(req, ["admin"])) return res.status(403).json({ error: "Forbidden" });
    const companyId = validateCompanyAccessHttp(req);
    const { id } = req.params;
    const result = await performanceReviewService.deletePerformanceReview(companyId, id);
    if (!result.done) {
      const status = result.error === "Performance review not found" || result.error?.includes("Invalid performance review ID") ? 404 : 400;
      return res.status(status).json({ error: result.error || "Failed to delete performance review" });
    }
    return res.status(200).json({ done: true, message: "Performance review deleted successfully" });
  } catch (error) {
    if (error.message?.includes("Company ID")) return res.status(403).json({ error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ----------------------
// Socket Controller (default export)
// ----------------------
const performanceReviewController = (socket, io) => {
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

  socket.on("performanceReview:create", async (data) => {
    try {
      if (!isAdminOrManager) throw new Error("Unauthorized: Admins or Managers only");
      const companyId = validateCompanyAccess(socket);
      
      const { employeeId, employeeInfo } = data || {};
      if (!employeeId) throw new Error("Employee ID is required");
      if (!employeeInfo?.name) throw new Error("Employee name is required");
      if (!employeeInfo?.empId) throw new Error("Employee ID is required");
      if (!employeeInfo?.department) throw new Error("Department is required");
      if (!employeeInfo?.designation) throw new Error("Designation is required");
      
      const result = await performanceReviewService.createPerformanceReview(companyId, data || {});
      socket.emit("performanceReview:create-response", result);
      if (result.done) io.to(`admin_room_${companyId}`).emit("performanceReview:performance-review-created", result);
    } catch (error) {
      socket.emit("performanceReview:create-response", { done: false, error: error.message });
    }
  });

  socket.on("performanceReview:getAll", async (filters = {}) => {
    try {
      const companyId = validateCompanyAccess(socket);
      const result = await performanceReviewService.getAllPerformanceReviews(companyId, filters);
      socket.emit("performanceReview:getAll-response", result);
    } catch (error) {
      socket.emit("performanceReview:getAll-response", { done: false, error: error.message });
    }
  });

  socket.on("performanceReview:getById", async (performanceReviewId) => {
    try {
      const companyId = validateCompanyAccess(socket);
      const result = await performanceReviewService.getPerformanceReviewById(companyId, performanceReviewId);
      socket.emit("performanceReview:getById-response", result);
    } catch (error) {
      socket.emit("performanceReview:getById-response", { done: false, error: error.message });
    }
  });

  socket.on("performanceReview:update", async ({ performanceReviewId, update }) => {
    try {
      if (!isAdminOrManager) throw new Error("Unauthorized: Admins or Managers only");
      const companyId = validateCompanyAccess(socket);
      const result = await performanceReviewService.updatePerformanceReview(companyId, performanceReviewId, update || {});
      socket.emit("performanceReview:update-response", result);
      if (result.done) io.to(`admin_room_${companyId}`).emit("performanceReview:performance-review-updated", result);
    } catch (error) {
      socket.emit("performanceReview:update-response", { done: false, error: error.message });
    }
  });

  socket.on("performanceReview:delete", async ({ performanceReviewId }) => {
    try {
      if (socket.userMetadata?.role !== "admin") throw new Error("Unauthorized: Admins only");
      const companyId = validateCompanyAccess(socket);
      const result = await performanceReviewService.deletePerformanceReview(companyId, performanceReviewId);
      socket.emit("performanceReview:delete-response", result);
      if (result.done) io.to(`admin_room_${companyId}`).emit("performanceReview:performance-review-deleted", result);
    } catch (error) {
      socket.emit("performanceReview:delete-response", { done: false, error: error.message });
    }
  });
};

export default performanceReviewController;