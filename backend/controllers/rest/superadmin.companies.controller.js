/**
 * Superadmin Companies REST Controller
 * REST API endpoints for superadmin company management
 */

import * as companiesService from '../../services/superadmin/companies.services.js';

/**
 * Fetch all active packages
 * @route   GET /api/superadmin/packages
 * @access  Private (Superadmin)
 */
export const fetchPackages = async (req, res) => {
  try {
    const result = await companiesService.fetchPackages();

    if (!result.done) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to fetch packages'
      });
    }

    res.json({
      success: true,
      data: result.data,
      show: result.show
    });
  } catch (error) {
    console.error('[Superadmin Companies] Error fetching packages:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch packages'
    });
  }
};

/**
 * Add a new company
 * @route   POST /api/superadmin/companies
 * @access  Private (Superadmin)
 */
export const addCompany = async (req, res) => {
  try {
    const userId = req.user?.userId;

    const result = await companiesService.addCompany(req.body, userId);

    if (!result.done) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to add company'
      });
    }

    res.json({
      success: true,
      data: result.data,
      message: 'Company added successfully'
    });
  } catch (error) {
    console.error('[Superadmin Companies] Error adding company:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add company'
    });
  }
};

/**
 * Fetch company list
 * @route   GET /api/superadmin/companies
 * @access  Private (Superadmin)
 */
export const fetchCompanyList = async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;

    const result = await companiesService.fetchCompanylist({
      status,
      startDate,
      endDate
    });

    if (!result.done) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to fetch company list'
      });
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('[Superadmin Companies] Error fetching company list:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch company list'
    });
  }
};

/**
 * Fetch company stats
 * @route   GET /api/superadmin/companies/stats
 * @access  Private (Superadmin)
 */
export const fetchCompanyStats = async (req, res) => {
  try {
    const result = await companiesService.fetchCompanystats();

    if (!result.done) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to fetch company stats'
      });
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('[Superadmin Companies] Error fetching company stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch company stats'
    });
  }
};

/**
 * View company details
 * @route   GET /api/superadmin/companies/:id
 * @access  Private (Superadmin)
 */
export const viewCompany = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await companiesService.fetchcompany(id);

    if (!result.done) {
      return res.status(404).json({
        success: false,
        error: result.error || 'Company not found'
      });
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('[Superadmin Companies] Error viewing company:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch company details'
    });
  }
};

/**
 * Edit company view (for edit modal)
 * @route   GET /api/superadmin/companies/:id/edit
 * @access  Private (Superadmin)
 */
export const editCompanyView = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await companiesService.fetcheditcompanyview(id);

    if (!result.done) {
      return res.status(404).json({
        success: false,
        error: result.error || 'Company not found'
      });
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('[Superadmin Companies] Error fetching edit company view:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch company details for editing'
    });
  }
};

/**
 * Update company
 * @route   PUT /api/superadmin/companies/:id
 * @access  Private (Superadmin)
 */
export const updateCompany = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await companiesService.updateCompany({
      ...req.body,
      _id: id
    });

    if (!result.done) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to update company'
      });
    }

    res.json({
      success: true,
      data: result.data,
      message: 'Company updated successfully'
    });
  } catch (error) {
    console.error('[Superadmin Companies] Error updating company:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update company'
    });
  }
};

/**
 * Delete company
 * @route   DELETE /api/superadmin/companies/:id
 * @access  Private (Superadmin)
 */
export const deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await companiesService.deleteCompany(id);

    if (!result.done) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to delete company'
      });
    }

    res.json({
      success: true,
      message: 'Company deleted successfully'
    });
  } catch (error) {
    console.error('[Superadmin Companies] Error deleting company:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete company'
    });
  }
};

export default {
  fetchPackages,
  addCompany,
  fetchCompanyList,
  fetchCompanyStats,
  viewCompany,
  editCompanyView,
  updateCompany,
  deleteCompany
};
