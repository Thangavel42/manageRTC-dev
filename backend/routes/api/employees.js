/**
 * Employee API Routes
 * REST API endpoints for Employee management
 */

import express from 'express';
import { uploadEmployeeImage } from '../../config/multer.config.js';
import {
    bulkUploadEmployees,
    checkDuplicates,
    checkLifecycleStatus,
    createEmployee,
    deleteEmployee,
    deleteEmployeeProfileImage, getActiveEmployeesList, getEmployeeById,
    getEmployeeReportees,
    getEmployees, getEmployeeStatsByDepartment,
    getMyProfile,
    reassignAndDeleteEmployee,
    searchEmployees,
    serveEmployeeProfileImage,
    syncMyEmployeeRecord,
    updateEmployee,
    updateMyProfile,
    uploadEmployeeProfileImage
} from '../../controllers/rest/employee.controller.js';
import {
    attachRequestId,
    authenticate,
    requireCompany,
    requireRole
} from '../../middleware/auth.js';
import {
    employeeSchemas,
    validateBody,
    validateQuery
} from '../../middleware/validate.js';

const router = express.Router();

// Apply request ID middleware to all routes
router.use(attachRequestId);

/**
 * Public Routes (Authenticated users can access their own profile)
 */

// Get current user's profile
router.get(
  '/me',
  authenticate,
  getMyProfile
);

// Update current user's profile
router.put(
  '/me',
  authenticate,
  validateBody(employeeSchemas.update),
  updateMyProfile
);

// Sync/create employee record for current user (from Clerk)
router.post(
  '/sync-my-employee',
  authenticate,
  syncMyEmployeeRecord
);

/**
 * Admin/HR Routes (Restricted access)
 */

// List all employees with pagination and filtering
router.get(
  '/',
  authenticate,
  requireCompany,
  (req, res, next) => {
    const roleFilter = (req.query?.role || '').toString().toLowerCase();
    if (roleFilter === 'manager') {
      return next();
    }
    return requireRole('admin', 'hr', 'superadmin')(req, res, next);
  },
  validateQuery(employeeSchemas.list),
  getEmployees
);

// List all active employees for dropdowns (no role restriction)
router.get(
  '/active-list',
  authenticate,
  requireCompany,
  getActiveEmployeesList
);

// Check for duplicate email/phone before creating employee
router.post(
  '/check-duplicates',
  authenticate,
  requireCompany,
  requireRole('admin', 'hr', 'superadmin'),
  checkDuplicates
);

// Check employee lifecycle status (resignation/termination)
// IMPORTANT: Must be before /:id routes to avoid matching as :id parameter
router.post(
  '/check-lifecycle-status',
  authenticate,
  requireCompany,
  requireRole('admin', 'hr', 'superadmin'),
  checkLifecycleStatus
);

// Create new employee
router.post(
  '/',
  authenticate,
  requireCompany,
  requireRole('admin', 'hr', 'superadmin'),
  validateBody(employeeSchemas.create),
  createEmployee
);

// Search employees
router.get(
  '/search',
  authenticate,
  requireCompany,
  requireRole('admin', 'hr', 'superadmin'),
  searchEmployees
);

// Get employee statistics by department
router.get(
  '/stats/by-department',
  authenticate,
  requireCompany,
  requireRole('admin', 'hr', 'superadmin'),
  getEmployeeStatsByDepartment
);

// Bulk upload employees
router.post(
  '/bulk-upload',
  authenticate,
  requireCompany,
  requireRole('admin', 'hr', 'superadmin'),
  bulkUploadEmployees
);

/**
 * Individual Employee Routes
 * NOTE: These must come AFTER all non-parameterized routes
 */

// Get single employee by ID
router.get(
  '/:id',
  authenticate,
  requireCompany,
  getEmployeeById
);

// Update employee
router.put(
  '/:id',
  authenticate,
  requireCompany,
  requireRole('admin', 'hr', 'superadmin'),
  validateBody(employeeSchemas.update),
  updateEmployee
);

// Reassign and delete employee (soft delete)
router.post(
  '/:id/reassign-delete',
  authenticate,
  requireCompany,
  requireRole('admin', 'superadmin'),
  validateBody(employeeSchemas.reassignDelete),
  reassignAndDeleteEmployee
);

// Delete employee (soft delete)
router.delete(
  '/:id',
  authenticate,
  requireCompany,
  requireRole('admin', 'superadmin'),
  deleteEmployee
);

// Get employee's reportees (subordinates)
router.get(
  '/:id/reportees',
  authenticate,
  requireCompany,
  requireRole('admin', 'hr', 'superadmin'),
  getEmployeeReportees
);

/**
 * Employee Profile Image Routes
 */

// Upload employee profile image
// Accessible by admin, hr, superadmin, or the employee themselves
router.post(
  '/:id/image',
  authenticate,
  requireCompany,
  (req, res, next) => {
    // Allow access if user is admin/hr/superadmin OR uploading their own image
    const userId = req.user?.userId;
    const paramId = req.params.id;

    // Get the employee's clerkUserId to check ownership
    if (req.user?.role !== 'admin' && req.user?.role !== 'hr' && req.user?.role !== 'superadmin') {
      // For non-admin users, they can only upload their own image
      // We'll verify ownership in the controller
    }
    next();
  },
  uploadEmployeeImage,
  uploadEmployeeProfileImage
);

// Delete employee profile image
router.delete(
  '/:id/image',
  authenticate,
  requireCompany,
  deleteEmployeeProfileImage
);

// Serve employee profile image info
router.get(
  '/:id/image',
  serveEmployeeProfileImage
);

export default router;
