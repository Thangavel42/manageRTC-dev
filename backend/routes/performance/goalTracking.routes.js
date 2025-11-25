import express from 'express';
import {
  createGoalTrackingCtrl,
  getAllGoalTrackingsCtrl,
  getGoalTrackingByIdCtrl,
  updateGoalTrackingCtrl,
  deleteGoalTrackingCtrl,
} from '../../controllers/performance/goalTracking.controller.js';
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

// Create a new goal tracking
router.post('/goal-trackings', createGoalTrackingCtrl);

// Get all goal trackings (supports filters via query params)
router.get('/goal-trackings', getAllGoalTrackingsCtrl);

// Get a single goal tracking by ID
router.get('/:id', getGoalTrackingByIdCtrl);

// Update a goal tracking by ID
router.put('/:id', updateGoalTrackingCtrl);

// Delete (soft) a goal tracking by ID
router.delete('/:id', deleteGoalTrackingCtrl);

export default router;
