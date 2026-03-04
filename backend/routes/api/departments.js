/**
 * Department Routes
 * REST API routes for department management
 */

import express from 'express';
import Joi from 'joi';
import {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  updateDepartmentStatus,
  searchDepartments,
  getDepartmentStats
} from '../../controllers/rest/department.controller.js';
import { authenticate } from '../../middleware/auth.js';
// ✅ PHASE 3 SECURITY FIX: Input validation
import {
  validateBody,
  validateQuery,
  validateParams,
  createDepartmentSchema,
  updateDepartmentSchema,
  departmentQuerySchema,
  objectIdSchema,
  statusSchema
} from '../../middleware/validation/index.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * @route   GET /api/departments
 * @desc    Get all departments with optional filters
 * @access  Private
 * @query   { status } string - Filter by status (Active, Inactive)
 * @query   { search } string - Search in department name
 * @query   { sortBy } string - Field to sort by (default: department)
 * @query   { sortOrder } string - Sort order (asc, desc)
 */
router.get('/', validateQuery(departmentQuerySchema), getAllDepartments);

/**
 * @route   GET /api/departments/stats
 * @desc    Get department statistics
 * @access  Private
 */
router.get('/stats', getDepartmentStats);

/**
 * @route   GET /api/departments/search
 * @desc    Search departments
 * @access  Private
 * @query   { q } string - Search query string
 */
router.get('/search', searchDepartments);

/**
 * @route   GET /api/departments/:id
 * @desc    Get department by ID
 * @access  Private
 * @param   { string } id - Department ID
 */
router.get('/:id', validateParams(Joi.object({ id: objectIdSchema.required() })), getDepartmentById);

/**
 * @route   POST /api/departments
 * @desc    Create new department
 * @access  Private
 * @body    { department: string, status: string }
 */
router.post('/', validateBody(createDepartmentSchema), createDepartment);

/**
 * @route   PUT /api/departments/:id
 * @desc    Update department
 * @access  Private
 * @param   { string } id - Department ID
 * @body    { department: string, status: string }
 */
router.put('/:id', validateBody(updateDepartmentSchema), validateParams(Joi.object({ id: objectIdSchema.required() })), updateDepartment);

/**
 * @route   PUT /api/departments/:id/status
 * @desc    Update department status
 * @access  Private
 * @param   { string } id - Department ID
 * @body    { status: string } - New status (Active, Inactive)
 */
router.put('/:id/status', validateBody(Joi.object({ isActive: Joi.boolean().required() })), validateParams(Joi.object({ id: objectIdSchema.required() })), updateDepartmentStatus);

/**
 * @route   DELETE /api/departments/:id
 * @desc    Delete department
 * @access  Private
 * @param   { string } id - Department ID
 */
router.delete('/:id', validateParams(Joi.object({ id: objectIdSchema.required() })), deleteDepartment);

export default router;
