/**
 * Employee API Routes
 * REST API endpoints for Employee management
 */

import express from 'express';
import { uploadEmployeeImage } from '../../config/multer.config.js';
import {
    bulkUploadEmployees,
    changeEmployeePassword,
    checkDuplicates,
    checkLifecycleStatus,
    createEmployee,
    deleteEmployee,
    deleteEmployeeProfileImage,
    exportEmployees,
    getActiveEmployeesList, getEmployeeById,
    getEmployeeReportees,
    getEmployees, getEmployeeStatsByDepartment,
    getMyProfile,
    reassignAndDeleteEmployee,
    searchEmployees,
    sendEmployeeCredentials,
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
    requireEmployeeActive,
    requireOwnEmployee, // ✅ SECURITY FIX: Prevent IDOR
    requireRole
} from '../../middleware/auth.js';
import { sanitizeBody, sanitizeQuery } from '../../middleware/inputSanitization.js'; // ✅ SECURITY FIX
import { requirePageAccess } from '../../middleware/pageAccess.js';
import { searchLimiter, uploadLimiter } from '../../middleware/rateLimiting.js'; // ✅ SECURITY FIX - Phase 2: Rate limiting
import {
    employeeSchemas,
    validateBody,
    validateQuery
} from '../../middleware/validate.js';
import { validateFile } from '../../middleware/validation/index.js'; // ✅ PHASE 3 SECURITY: File upload validation
import emailChangeRoutes from './emailChange.routes.js';

const router = express.Router();

// Apply request ID middleware to all routes
router.use(attachRequestId);

/**
 * Public Routes (Authenticated users can access their own profile)
 */

// Get current user's profile (accessible during login - no status check)
router.get(
  '/me',
  authenticate,
  requireOwnEmployee,  // ✅ SECURITY FIX: Prevent IDOR
  getMyProfile
);

// Update current user's profile
router.put(
  '/me',
  authenticate,
  requireOwnEmployee,  // ✅ SECURITY FIX: Prevent IDOR
  sanitizeBody,        // ✅ SECURITY FIX: Remove MongoDB operators
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
  searchLimiter,  // ✅ SECURITY FIX - Phase 2: 30 searches per minute
  authenticate,
  sanitizeQuery,  // ✅ SECURITY FIX: Prevent NoSQL injection via search
  requireCompany,
  (req, res, next) => {
    const roleFilter = (req.query?.role || '').toString().toLowerCase();
    const reportingManagerList = (req.query?.reportingManagerList || '').toString().toLowerCase() === 'true';
    if (roleFilter === 'manager' || reportingManagerList) {
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
  requireEmployeeActive,
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

// Export employees (PDF/Excel)
router.get(
  '/export',
  authenticate,
  requireCompany,
  requireRole('admin', 'hr', 'superadmin'),
  exportEmployees
);

// Export employees using JSON payload (format + employeeIds)
router.post(
  '/export',
  authenticate,
  requireCompany,
  requireRole('admin', 'hr', 'superadmin'),
  sanitizeBody,
  exportEmployees
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
  searchLimiter,  // ✅ SECURITY FIX - Phase 2: 30 searches per minute
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
 * Email Change Routes
 * All routes for email change functionality with OTP verification
 * IMPORTANT: These must come BEFORE /:id routes to avoid being captured as :id parameter
 */
router.use('/', emailChangeRoutes);

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
// Uses RBAC - requires 'hrm.employees' page with 'delete' action
router.delete(
  '/:id',
  authenticate,
  requireCompany,
  requirePageAccess('hrm.employees', 'delete'),
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
  uploadLimiter,  // ✅ SECURITY FIX - Phase 2: 20 uploads per hour
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
  uploadEmployeeImage,  // Multer file upload
  validateFile({  // ✅ PHASE 3 SECURITY: File validation
    required: true,
    maxSize: 2 * 1024 * 1024,  // 2MB for profile images
    allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp']
  }),
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

/**
 * @route   POST /api/employees/:id/send-credentials
 * @desc    Generate new password and send login credentials email to employee
 * @access  Private (HR / Admin)
 */
router.post(
  '/:id/send-credentials',
  authenticate,
  requireCompany,
  requireRole('hr', 'admin', 'superadmin'),
  sendEmployeeCredentials
);

/**
 * @route   POST /api/employees/:id/change-password
 * @desc    HR/Admin changes employee password (no current password required)
 * @access  Private (HR / Admin)
 */
router.post(
  '/:id/change-password',
  authenticate,
  requireCompany,
  requireRole('hr', 'admin', 'superadmin'),
  changeEmployeePassword
);

export default router;
