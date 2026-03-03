/**
 * Candidates REST API Controller
 * Handles all CRUD operations for candidates via REST API
 */

import * as candidateService from '../../services/candidates/candidates.services.js';
import { extractUser } from '../../utils/apiResponse.js';
import { devError, devLog } from '../../utils/logger.js';

// Helper to validate company access
const validateCompanyAccess = (user) => {
  if (!user.companyId) {
    devError('[Candidate REST] Company ID not found in user metadata');
    throw new Error('Company ID not found in user metadata');
  }

  const companyIdRegex = /^[a-zA-Z0-9_-]{3,50}$/;
  if (!companyIdRegex.test(user.companyId)) {
    devError(`[Candidate REST] Invalid company ID format: ${user.companyId}`);
    throw new Error('Invalid company ID format');
  }

  return user.companyId;
};

// Check role permissions
const checkReadPermission = (userRole) => {
  const role = userRole?.toLowerCase();
  return ['admin', 'hr', 'manager', 'superadmin'].includes(role);
};

const checkWritePermission = (userRole) => {
  const role = userRole?.toLowerCase();
  return ['admin', 'hr', 'superadmin'].includes(role);
};

/**
 * GET /api/candidates
 * Get all candidates with optional filters
 */
export const getAllCandidates = async (req, res) => {
  try {
    const user = extractUser(req);
    devLog('[Candidate REST] GET /api/candidates', {
      user: user.userId,
      role: user.role,
      companyId: user.companyId,
      query: req.query,
    });

    if (!checkReadPermission(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: You do not have permission to access candidates',
      });
    }

    const companyId = validateCompanyAccess(user);

    // Extract filters from query params
    const filters = {
      status: req.query.status,
      appliedRole: req.query.appliedRole,
      experienceLevel: req.query.experienceLevel,
      recruiterId: req.query.recruiterId,
      search: req.query.search,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
    };

    // Remove undefined values
    Object.keys(filters).forEach((key) => filters[key] === undefined && delete filters[key]);

    const result = await candidateService.getCandidates(companyId, filters);

    if (!result.done) {
      devError('[Candidate REST] Failed to get candidates', { error: result.error });
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to fetch candidates',
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data || [],
      message: 'Candidates retrieved successfully',
    });
  } catch (error) {
    devError('[Candidate REST] Error in getAllCandidates', { error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/candidates/all-data
 * Get all candidates and stats
 */
export const getAllData = async (req, res) => {
  try {
    const user = extractUser(req);
    devLog('[Candidate REST] GET /api/candidates/all-data', {
      user: user.userId,
      role: user.role,
      companyId: user.companyId,
    });

    if (!checkReadPermission(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: You do not have permission to access candidates',
      });
    }

    const companyId = validateCompanyAccess(user);

    // Extract filters from query params
    const filters = {
      status: req.query.status,
      appliedRole: req.query.appliedRole,
      experienceLevel: req.query.experienceLevel,
      recruiterId: req.query.recruiterId,
      search: req.query.search,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
    };

    // Remove undefined values
    Object.keys(filters).forEach((key) => filters[key] === undefined && delete filters[key]);

    const [candidates, stats] = await Promise.all([
      candidateService.getCandidates(companyId, filters),
      candidateService.getCandidateStats(companyId),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        candidates: candidates.data || [],
        stats: stats.data || {},
      },
      message: 'All candidate data retrieved successfully',
    });
  } catch (error) {
    devError('[Candidate REST] Error in getAllData', { error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/candidates/stats
 * Get candidate statistics
 */
export const getStats = async (req, res) => {
  try {
    const user = extractUser(req);
    devLog('[Candidate REST] GET /api/candidates/stats', {
      user: user.userId,
      role: user.role,
      companyId: user.companyId,
    });

    if (!checkReadPermission(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: You do not have permission to access candidate statistics',
      });
    }

    const companyId = validateCompanyAccess(user);

    const result = await candidateService.getCandidateStats(companyId);

    if (!result.done) {
      devError('[Candidate REST] Failed to get candidate stats', { error: result.error });
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to fetch candidate statistics',
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data || {},
      message: 'Statistics retrieved successfully',
    });
  } catch (error) {
    devError('[Candidate REST] Error in getStats', { error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/candidates/:id
 * Get candidate by ID
 */
export const getCandidateById = async (req, res) => {
  try {
    const user = extractUser(req);
    const { id } = req.params;

    devLog('[Candidate REST] GET /api/candidates/:id', {
      user: user.userId,
      role: user.role,
      companyId: user.companyId,
      candidateId: id,
    });

    if (!checkReadPermission(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: You do not have permission to access candidates',
      });
    }

    const companyId = validateCompanyAccess(user);

    const result = await candidateService.getCandidateById(companyId, id);

    if (!result.done) {
      devError('[Candidate REST] Failed to get candidate', { error: result.error });
      return res.status(404).json({
        success: false,
        error: result.error || 'Candidate not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data,
      message: 'Candidate retrieved successfully',
    });
  } catch (error) {
    devError('[Candidate REST] Error in getCandidateById', { error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /api/candidates
 * Create new candidate
 */
export const createCandidate = async (req, res) => {
  try {
    const user = extractUser(req);
    devLog('[Candidate REST] POST /api/candidates', {
      user: user.userId,
      role: user.role,
      companyId: user.companyId,
      data: req.body,
    });

    if (!checkWritePermission(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Admin, HR, or superadmin role required',
      });
    }

    const companyId = validateCompanyAccess(user);

    // Validate required fields
    if (!req.body.firstName || !req.body.lastName || !req.body.email || !req.body.appliedRole) {
      return res.status(400).json({
        success: false,
        error: 'First name, last name, email, and applied role are required',
      });
    }

    // Always include companyId in the candidate data
    const candidateData = {
      ...req.body,
      companyId,
    };

    const result = await candidateService.createCandidate(companyId, candidateData);

    if (!result.done) {
      devError('[Candidate REST] Failed to create candidate', { error: result.error });
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to create candidate',
      });
    }

    return res.status(201).json({
      success: true,
      data: result.data,
      message: 'Candidate created successfully',
    });
  } catch (error) {
    devError('[Candidate REST] Error in createCandidate', { error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * PUT /api/candidates/:id
 * Update candidate
 */
export const updateCandidate = async (req, res) => {
  try {
    const user = extractUser(req);
    const { id } = req.params;

    devLog('[Candidate REST] PUT /api/candidates/:id', {
      user: user.userId,
      role: user.role,
      companyId: user.companyId,
      candidateId: id,
      data: req.body,
    });

    if (!checkWritePermission(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Admin, HR, or superadmin role required',
      });
    }

    const companyId = validateCompanyAccess(user);

    const result = await candidateService.updateCandidate(companyId, id, req.body);

    if (!result.done) {
      devError('[Candidate REST] Failed to update candidate', { error: result.error });
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to update candidate',
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data,
      message: 'Candidate updated successfully',
    });
  } catch (error) {
    devError('[Candidate REST] Error in updateCandidate', { error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * DELETE /api/candidates/:id
 * Delete candidate
 */
export const deleteCandidate = async (req, res) => {
  try {
    const user = extractUser(req);
    const { id } = req.params;

    devLog('[Candidate REST] DELETE /api/candidates/:id', {
      user: user.userId,
      role: user.role,
      companyId: user.companyId,
      candidateId: id,
    });

    if (!checkWritePermission(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Admin, HR, or superadmin role required',
      });
    }

    const companyId = validateCompanyAccess(user);

    const result = await candidateService.deleteCandidate(companyId, id);

    if (!result.done) {
      devError('[Candidate REST] Failed to delete candidate', { error: result.error });
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to delete candidate',
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data,
      message: 'Candidate deleted successfully',
    });
  } catch (error) {
    devError('[Candidate REST] Error in deleteCandidate', { error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * PATCH /api/candidates/:id/status
 * Update candidate status
 */
export const updateCandidateStatus = async (req, res) => {
  try {
    const user = extractUser(req);
    const { id } = req.params;
    const { status, notes } = req.body;

    devLog('[Candidate REST] PATCH /api/candidates/:id/status', {
      user: user.userId,
      role: user.role,
      companyId: user.companyId,
      candidateId: id,
      status,
      notes,
    });

    if (!checkWritePermission(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Admin, HR, or superadmin role required',
      });
    }

    const companyId = validateCompanyAccess(user);

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required',
      });
    }

    const statusData = {
      status,
      notes: notes || `Status updated to ${status}`,
      updatedBy: user.name || user.email || 'Unknown',
    };

    const result = await candidateService.updateCandidateStatus(companyId, id, statusData);

    if (!result.done) {
      devError('[Candidate REST] Failed to update candidate status', { error: result.error });
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to update candidate status',
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data,
      message: 'Candidate status updated successfully',
    });
  } catch (error) {
    devError('[Candidate REST] Error in updateCandidateStatus', { error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /api/candidates/export/pdf
 * Export candidates as PDF
 */
export const exportPDF = async (req, res) => {
  try {
    const user = extractUser(req);
    devLog('[Candidate REST] POST /api/candidates/export/pdf', {
      user: user.userId,
      role: user.role,
      companyId: user.companyId,
    });

    if (!checkReadPermission(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: You do not have permission to export candidates',
      });
    }

    const companyId = validateCompanyAccess(user);

    const result = await candidateService.exportCandidatesPDF(companyId);

    if (!result.done) {
      devError('[Candidate REST] Failed to export PDF', { error: result.error });
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to export PDF',
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data,
      message: 'PDF exported successfully',
    });
  } catch (error) {
    devError('[Candidate REST] Error in exportPDF', { error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /api/candidates/export/excel
 * Export candidates as Excel
 */
export const exportExcel = async (req, res) => {
  try {
    const user = extractUser(req);
    devLog('[Candidate REST] POST /api/candidates/export/excel', {
      user: user.userId,
      role: user.role,
      companyId: user.companyId,
    });

    if (!checkReadPermission(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: You do not have permission to export candidates',
      });
    }

    const companyId = validateCompanyAccess(user);

    const result = await candidateService.exportCandidatesExcel(companyId);

    if (!result.done) {
      devError('[Candidate REST] Failed to export Excel', { error: result.error });
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to export Excel',
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data,
      message: 'Excel exported successfully',
    });
  } catch (error) {
    devError('[Candidate REST] Error in exportExcel', { error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /api/candidates/bulk-update
 * Bulk update candidates
 */
export const bulkUpdate = async (req, res) => {
  try {
    const user = extractUser(req);
    const { candidateIds, action, status, notes } = req.body;

    devLog('[Candidate REST] POST /api/candidates/bulk-update', {
      user: user.userId,
      role: user.role,
      companyId: user.companyId,
      candidateIds,
      action,
    });

    if (!checkWritePermission(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Admin, HR, or superadmin role required',
      });
    }

    const companyId = validateCompanyAccess(user);

    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Candidate IDs array is required',
      });
    }

    const results = [];
    for (const candidateId of candidateIds) {
      try {
        let result;
        if (action === 'updateStatus') {
          const statusData = {
            status,
            notes: notes || `Bulk status update to ${status}`,
            updatedBy: user.name || user.email || 'Unknown',
          };
          result = await candidateService.updateCandidateStatus(companyId, candidateId, statusData);
        } else if (action === 'delete') {
          result = await candidateService.deleteCandidate(companyId, candidateId);
        } else {
          result = { done: false, error: 'Invalid bulk action' };
        }
        results.push({ candidateId, result });
      } catch (error) {
        results.push({ candidateId, result: { done: false, error: error.message } });
      }
    }

    const response = {
      results,
      successCount: results.filter((r) => r.result.done).length,
      errorCount: results.filter((r) => !r.result.done).length,
    };

    return res.status(200).json({
      success: true,
      data: response,
      message: 'Bulk update completed',
    });
  } catch (error) {
    devError('[Candidate REST] Error in bulkUpdate', { error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
