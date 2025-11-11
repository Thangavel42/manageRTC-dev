import express from 'express';
import {
  createPerformanceIndicatorCtrl,
  getAllPerformanceIndicatorsCtrl,
  getPerformanceIndicatorByIdCtrl,
  updatePerformanceIndicatorCtrl,
  deletePerformanceIndicatorCtrl,
} from '../controllers/performance/performanceIndicator.controller.js';
import { authenticateUser } from '../controllers/socialfeed/socialFeed.controller.js';
import { validateCompanyAccess } from '../controllers/socialfeed/validation.middleware.js';

const router = express.Router();

// Auth: production uses Clerk; development supports a simple bypass
if (process.env.NODE_ENV === 'production') {
  router.use(authenticateUser);
  router.use(validateCompanyAccess);
} else {
  router.use((req, res, next) => {
    // If Authorization is provided, fall back to real auth chain
    if (req.headers.authorization) return next();

    const devCompanyId = req.header('x-dev-company-id') || '68443081dcdfe43152aebf80';
    const devRole = req.header('x-dev-role') || 'admin';
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

// Create a new performance indicator
// These routes are mounted at /api/performance/indicators in server.js
router.post('/', createPerformanceIndicatorCtrl);

// Get all performance indicators (supports filters via query params)
router.get('/', getAllPerformanceIndicatorsCtrl);

// Get a single performance indicator by ID
router.get('/:id', getPerformanceIndicatorByIdCtrl);

// Update a performance indicator by ID
router.put('/:id', updatePerformanceIndicatorCtrl);

// Delete (soft) a performance indicator by ID
router.delete('/:id', deletePerformanceIndicatorCtrl);

export default router;