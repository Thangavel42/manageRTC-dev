import express from 'express';
import { getTenantCollections } from '../config/db.js';
import {
  getJobsStats,
  getJobsList,
  getJobDetails,
  createJob,
  updateJob,
  deleteJob,
  bulkDeleteJobs,
  updateJobStatus,
  getJobCategories,
  getJobTypes,
  exportJobsPDF,
  exportJobsExcel
} from '../controllers/jobs/jobs.controller.js';

const router = express.Router();

// Middleware to get tenant collections
const getCollections = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    if (!companyId) {
      return res.status(400).json({
        done: false,
        message: "Company ID is required"
      });
    }
    
    req.collections = getTenantCollections();
    next();
  } catch (error) {
    console.error("Error getting collections:", error);
    res.status(500).json({
      done: false,
      message: "Database connection error"
    });
  }
};

// Apply middleware to all routes
router.use('/:companyId', getCollections);

// Jobs statistics
router.get('/:companyId/stats', getJobsStats);

// Jobs list with filters and pagination
router.get('/:companyId/list', getJobsList);

// Get specific job details
router.get('/:companyId/job/:jobId', getJobDetails);

// Create a new job
router.post('/:companyId/create', createJob);

// Update a job
router.put('/:companyId/job/:jobId', updateJob);

// Delete a job
router.delete('/:companyId/job/:jobId', deleteJob);

// Bulk delete jobs
router.delete('/:companyId/bulk-delete', bulkDeleteJobs);

// Update job status
router.patch('/:companyId/job/:jobId/status', updateJobStatus);

// Get job categories
router.get('/categories', getJobCategories);

// Get job types
router.get('/types', getJobTypes);

// Export jobs as PDF
router.post('/:companyId/export/pdf', exportJobsPDF);

// Export jobs as Excel
router.post('/:companyId/export/excel', exportJobsExcel);

export default router;
