/**
 * Policy REST API Routes
 * All policy-related endpoints
 */

import express from 'express';
import Joi from 'joi';
import { authenticate } from '../../middleware/auth.js';
import {
  getAllPolicies,
  getPolicyById,
  createPolicy,
  updatePolicy,
  deletePolicy,
  getPolicyStats,
  searchPolicies
} from '../../controllers/rest/policy.controller.js';
// ✅ PHASE 3 SECURITY FIX: Input validation
import {
  validateBody,
  validateQuery,
  validateParams,
  createPolicySchema,
  updatePolicySchema,
  policyQuerySchema,
  objectIdSchema
} from '../../middleware/validation/index.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/policies
 * @desc    Get all policies with optional filtering
 * @query   department - Filter by department ID
 * @query   startDate - Filter by start date
 * @query   endDate - Filter by end date
 * @query   sortBy - Sort field (default: effectiveDate)
 * @query   sortOrder - Sort order: asc/desc (default: desc)
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 50)
 */
router.get('/', validateQuery(policyQuerySchema), getAllPolicies);

/**
 * @route   GET /api/policies/stats
 * @desc    Get policy statistics
 */
router.get('/stats', getPolicyStats);

/**
 * @route   GET /api/policies/search
 * @desc    Search policies by name or description
 * @query   q - Search query
 */
router.get('/search', searchPolicies);

/**
 * @route   GET /api/policies/:id
 * @desc    Get policy by ID
 */
router.get('/:id', validateParams(Joi.object({ id: objectIdSchema.required() })), getPolicyById);

/**
 * @route   POST /api/policies
 * @desc    Create new policy
 * @body    policyName - Policy name (required)
 * @body    policyDescription - Policy description (required)
 * @body    effectiveDate - Effective date (required)
 * @body    applyToAll - Apply to all employees (default: false)
 * @body    assignTo - Array of department/designation assignments
 */
router.post('/', validateBody(createPolicySchema), createPolicy);

/**
 * @route   PUT /api/policies/:id
 * @desc    Update policy
 * @body    policyName - Policy name
 * @body    policyDescription - Policy description
 * @body    effectiveDate - Effective date
 * @body    applyToAll - Apply to all employees
 * @body    assignTo - Array of department/designation assignments
 */
router.put('/:id', validateBody(updatePolicySchema), validateParams(Joi.object({ id: objectIdSchema.required() })), updatePolicy);

/**
 * @route   DELETE /api/policies/:id
 * @desc    Delete policy (soft delete)
 */
router.delete('/:id', validateParams(Joi.object({ id: objectIdSchema.required() })), deletePolicy);

export default router;
