import express from 'express';
import {
  createPerformanceReviewCtrl,
  getAllPerformanceReviewsCtrl,
  getPerformanceReviewByIdCtrl,
  updatePerformanceReviewCtrl,
  deletePerformanceReviewCtrl,
} from '../../controllers/performance/performanceReview.controller.js';
import { authenticateUser } from '../../controllers/socialfeed/socialFeed.controller.js';
import { validateCompanyAccess } from '../../controllers/socialfeed/validation.middleware.js';

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

// Create a new performance review
router.post('/performance-reviews', createPerformanceReviewCtrl);

// Get all performance reviews (supports filters via query params)
router.get('/performance-reviews', getAllPerformanceReviewsCtrl);

// Get a single performance review by ID
router.get('/:id', getPerformanceReviewByIdCtrl);

// Update a performance review by ID
router.put('/:id', updatePerformanceReviewCtrl);

// Delete (soft) a performance review by ID
router.delete('/:id', deletePerformanceReviewCtrl);

export default router;