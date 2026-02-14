/**
 * Superadmin Companies API Routes
 * REST API endpoints for superadmin company management
 */

import express from 'express';
import {
  fetchPackages,
  addCompany,
  fetchCompanyList,
  fetchCompanyStats,
  viewCompany,
  editCompanyView,
  updateCompany,
  deleteCompany
} from '../../controllers/rest/superadmin.companies.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = express.Router();

/**
 * All routes require superadmin role
 */
router.use(authenticate);
router.use(requireRole('superadmin'));

/**
 * @route   GET /api/superadmin/packages
 * @desc    Get all active packages for company creation
 * @access  Private (Superadmin)
 */
router.get('/packages', fetchPackages);

/**
 * @route   GET /api/superadmin/companies/stats
 * @desc    Get company statistics (total, active, inactive, location)
 * @access  Private (Superadmin)
 */
router.get('/companies/stats', fetchCompanyStats);

/**
 * @route   GET /api/superadmin/companies
 * @desc    Get list of all companies with optional filters
 * @access  Private (Superadmin)
 * @query   status - Filter by status (Active/Inactive)
 * @query   startDate - Filter by start date
 * @query   endDate - Filter by end date
 */
router.get('/companies', fetchCompanyList);

/**
 * @route   POST /api/superadmin/companies
 * @desc    Create a new company
 * @access  Private (Superadmin)
 */
router.post('/companies', addCompany);

/**
 * @route   GET /api/superadmin/companies/:id
 * @desc    Get company details for viewing
 * @access  Private (Superadmin)
 */
router.get('/companies/:id', viewCompany);

/**
 * @route   GET /api/superadmin/companies/:id/edit
 * @desc    Get company details for editing
 * @access  Private (Superadmin)
 */
router.get('/companies/:id/edit', editCompanyView);

/**
 * @route   PUT /api/superadmin/companies/:id
 * @desc    Update company details
 * @access  Private (Superadmin)
 */
router.put('/companies/:id', updateCompany);

/**
 * @route   DELETE /api/superadmin/companies/:id
 * @desc    Delete a company
 * @access  Private (Superadmin)
 */
router.delete('/companies/:id', deleteCompany);

export default router;
