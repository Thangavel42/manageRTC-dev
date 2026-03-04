/**
 * Designation REST API Routes
 * Designation-related endpoints
 */

import express from 'express';
import Joi from 'joi';
import { authenticate } from '../../middleware/auth.js';
import {
  getAllDesignations,
  getDesignationById,
  createDesignation,
  updateDesignationById,
  updateDesignationStatus,
  deleteDesignationById
} from '../../controllers/rest/designation.controller.js';
// ✅ PHASE 3 SECURITY FIX: Input validation
import {
  validateBody,
  validateQuery,
  validateParams,
  createDesignationSchema,
  updateDesignationSchema,
  designationQuerySchema,
  objectIdSchema
} from '../../middleware/validation/index.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/designations
 * @desc    Get all designations with optional filtering
 * @query   departmentId - Filter by department ID
 * @query   status - Filter by status
 */
router.get('/', validateQuery(designationQuerySchema), getAllDesignations);

/**
 * @route   GET /api/designations/:id
 * @desc    Get single designation by ID
 * @param   { string } id - Designation ID
 */
router.get('/:id', validateParams(Joi.object({ id: objectIdSchema.required() })), getDesignationById);

/**
 * @route   POST /api/designations
 * @desc    Create new designation
 * @body    { designation: string, departmentId: string, status?: string }
 */
router.post('/', validateBody(createDesignationSchema), createDesignation);

/**
 * @route   PUT /api/designations/:id
 * @desc    Update designation
 * @param   { string } id - Designation ID
 * @body    { designation?: string, departmentId?: string, status?: string }
 */
router.put('/:id', validateBody(updateDesignationSchema), validateParams(Joi.object({ id: objectIdSchema.required() })), updateDesignationById);

/**
 * @route   PUT /api/designations/:id/status
 * @desc    Update designation status
 * @param   { string } id - Designation ID
 * @body    { status: string } - New status (Active, Inactive, etc.)
 */
router.put('/:id/status', validateBody(Joi.object({ isActive: Joi.boolean().required() })), validateParams(Joi.object({ id: objectIdSchema.required() })), updateDesignationStatus);

/**
 * @route   DELETE /api/designations/:id
 * @desc    Delete designation
 * @param   { string } id - Designation ID
 * @body    { reassignTo?: string } - Optional: Reassign employees to this designation ID
 */
router.delete('/:id', validateParams(Joi.object({ id: objectIdSchema.required() })), deleteDesignationById);

export default router;
