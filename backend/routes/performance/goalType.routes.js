import express from 'express';
import {
  createGoalTypeCtrl,
  getAllGoalTypesCtrl,
  getGoalTypeByIdCtrl,
  updateGoalTypeCtrl,
  deleteGoalTypeCtrl,
} from '../../controllers/performance/goalType.controller.js';
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

// Create a new goal type
router.post('/goal-types', createGoalTypeCtrl);

// Get all goal types (supports filters via query params)
router.get('/goal-types', getAllGoalTypesCtrl);

// Get a single goal type by ID
router.get('/:id', getGoalTypeByIdCtrl);

// Update a goal type by ID
router.put('/:id', updateGoalTypeCtrl);

// Delete (soft) a goal type by ID
router.delete('/:id', deleteGoalTypeCtrl);

export default router;
