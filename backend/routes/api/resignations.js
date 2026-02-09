/**
 * Resignation REST API Routes
 * All resignation management endpoints
 */

import express from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate, validateBody, validateQuery, validateParams } from '../../middleware/validate.js';
import { resignationSchemas, commonSchemas } from '../../middleware/validate.js';
import resignationController from '../../controllers/rest/resignation.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/resignations/stats
 * @desc    Get resignation statistics
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/stats', requireRole('admin', 'hr', 'superadmin'), resignationController.getStats);

/**
 * @route   GET /api/resignations/departments
 * @desc    Get departments for resignation filter
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/departments', requireRole('admin', 'hr', 'superadmin'), resignationController.getResignationDepartments);

/**
 * @route   GET /api/resignations/employees/:departmentId
 * @desc    Get employees by department
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/employees/:departmentId', requireRole('admin', 'hr', 'superadmin'), resignationController.getEmployeesByDepartmentId);

/**
 * @route   GET /api/resignations
 * @desc    Get all resignations
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/', requireRole('admin', 'hr', 'superadmin'), validateQuery(resignationSchemas.list), resignationController.getAllResignations);

/**
 * @route   GET /api/resignations/:id
 * @desc    Get single resignation by ID
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/:id', requireRole('admin', 'hr', 'superadmin'), validateParams(commonSchemas.objectId), resignationController.getResignationById);

/**
 * @route   POST /api/resignations
 * @desc    Create new resignation
 * @access  Private (Admin, HR, Superadmin)
 */
router.post('/', requireRole('admin', 'hr', 'superadmin'), validateBody(resignationSchemas.create), resignationController.createResignation);

/**
 * @route   PUT /api/resignations/:id
 * @desc    Update resignation
 * @access  Private (Admin, HR, Superadmin)
 */
router.put('/:id', requireRole('admin', 'hr', 'superadmin'), validateParams(commonSchemas.objectId), validateBody(resignationSchemas.update), resignationController.updateResignationById);

/**
 * @route   PUT /api/resignations/:id/approve
 * @desc    Approve resignation
 * @access  Private (Admin, HR, Superadmin)
 */
router.put('/:id/approve', requireRole('admin', 'hr', 'superadmin'), validateParams(commonSchemas.objectId), resignationController.approveResignationById);

/**
 * @route   PUT /api/resignations/:id/reject
 * @desc    Reject resignation
 * @access  Private (Admin, HR, Superadmin)
 */
router.put('/:id/reject', requireRole('admin', 'hr', 'superadmin'), validateParams(commonSchemas.objectId), validateBody(resignationSchemas.reject), resignationController.rejectResignationById);

/**
 * @route   PUT /api/resignations/:id/process
 * @desc    Process resignation (mark as effective)
 * @access  Private (Admin, HR, Superadmin)
 */
router.put('/:id/process', requireRole('admin', 'hr', 'superadmin'), validateParams(commonSchemas.objectId), resignationController.processResignationById);

/**
 * @route   DELETE /api/resignations
 * @desc    Delete resignations (bulk delete)
 * @access  Private (Admin, Superadmin)
 */
router.delete('/', requireRole('admin', 'superadmin'), resignationController.deleteResignations);

export default router;
