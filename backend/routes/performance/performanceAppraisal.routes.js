import express from "express";
import {
  createPerformanceAppraisalCtrl,
  getAllPerformanceAppraisalsCtrl,
  getPerformanceAppraisalByIdCtrl,
  updatePerformanceAppraisalCtrl,
  deletePerformanceAppraisalCtrl,
} from "../../controllers/performance/performanceAppraisal.controller.js";
import { authenticateUser } from "../../controllers/socialfeed/socialFeed.controller.js";
import { validateCompanyAccess } from "../../controllers/socialfeed/validation.middleware.js";

const router = express.Router();

// Auth: production uses Clerk; development supports a simple bypass
if (process.env.NODE_ENV === "production") {
  router.use(authenticateUser);
  router.use(validateCompanyAccess);
} else {
  router.use((req, res, next) => {
    // If Authorization is provided, fall back to real auth chain
    if (req.headers.authorization) return next();

    const devCompanyId =
      req.header("x-dev-company-id") || "68443081dcdfe43152aebf80";
    const devRole = req.header("x-dev-role") || "admin";
    req.user = {
      publicMetadata: {
        companyId: devCompanyId,
        role: devRole,
      },
    };
    req.companyId = devCompanyId;
    next();
  });
}

// Create a new performance appraisal
router.post("/performance-appraisals", createPerformanceAppraisalCtrl);

// Get all performance appraisals (supports filters via query params)
router.get("/performance-appraisals", getAllPerformanceAppraisalsCtrl);

// Get a single performance appraisal by ID
router.get("/:id", getPerformanceAppraisalByIdCtrl);

// Update a performance appraisal by ID
router.put("/:id", updatePerformanceAppraisalCtrl);

// Delete (soft) a performance appraisal by ID
router.delete("/:id", deletePerformanceAppraisalCtrl);

export default router;
