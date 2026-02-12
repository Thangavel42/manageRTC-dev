/**
 * Module Controller
 * Handles HTTP requests for module and page management
 */

import moduleService from '../../services/rbac/module.service.js';

/**
 * Get all modules
 * @route GET /api/rbac/modules
 */
export const getAllModules = async (req, res) => {
  const { isActive } = req.query;

  const filters = {};
  if (isActive !== undefined) filters.isActive = isActive;

  const result = await moduleService.getAllModules(filters);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: { message: result.error },
    });
  }

  return res.json({
    success: true,
    data: result.data,
  });
};

/**
 * Get module statistics
 * @route GET /api/rbac/modules/stats
 */
export const getModuleStats = async (req, res) => {
  const result = await moduleService.getModuleStats();

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: { message: result.error },
    });
  }

  return res.json({
    success: true,
    data: result.data,
  });
};

/**
 * Get menu structure for sidebar
 * @route GET /api/rbac/modules/menu
 */
export const getMenuStructure = async (req, res) => {
  const result = await moduleService.getMenuStructure();

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: { message: result.error },
    });
  }

  return res.json({
    success: true,
    data: result.data,
  });
};

/**
 * Get a single module by ID
 * @route GET /api/rbac/modules/:id
 */
export const getModuleById = async (req, res) => {
  const { id } = req.params;

  const result = await moduleService.getModuleById(id);

  if (!result.success) {
    return res.status(404).json({
      success: false,
      error: { message: result.error },
    });
  }

  return res.json({
    success: true,
    data: result.data,
  });
};

/**
 * Create a new module
 * @route POST /api/rbac/modules
 */
export const createModule = async (req, res) => {
  const userId = req.user?.id || null;
  const result = await moduleService.createModule(req.body, userId);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: { message: result.error },
    });
  }

  return res.status(201).json({
    success: true,
    data: result.data,
    message: result.message,
  });
};

/**
 * Update a module
 * @route PUT /api/rbac/modules/:id
 */
export const updateModule = async (req, res) => {
  const { id } = req.params;

  const result = await moduleService.updateModule(id, req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: { message: result.error },
    });
  }

  return res.json({
    success: true,
    data: result.data,
    message: result.message,
  });
};

/**
 * Delete a module (soft delete)
 * @route DELETE /api/rbac/modules/:id
 */
export const deleteModule = async (req, res) => {
  const { id } = req.params;

  const result = await moduleService.deleteModule(id);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: { message: result.error },
    });
  }

  return res.json({
    success: true,
    data: result.data,
    message: result.message,
  });
};

/**
 * Toggle module active status
 * @route PATCH /api/rbac/modules/:id/toggle-status
 */
export const toggleModuleStatus = async (req, res) => {
  const { id } = req.params;

  const result = await moduleService.toggleModuleStatus(id);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: { message: result.error },
    });
  }

  return res.json({
    success: true,
    data: result.data,
    message: result.message,
  });
};

// ==================== PAGE MANAGEMENT ====================

/**
 * Get all pages
 * @route GET /api/rbac/modules/pages
 */
export const getAllPages = async (req, res) => {
  const { isActive, moduleCategory } = req.query;

  const filters = {};
  if (isActive !== undefined) filters.isActive = isActive;
  if (moduleCategory) filters.moduleCategory = moduleCategory;

  const result = await moduleService.getAllPages(filters);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: { message: result.error },
    });
  }

  return res.json({
    success: true,
    data: result.data,
  });
};

/**
 * Get pages grouped by module category
 * @route GET /api/rbac/modules/pages/grouped
 */
export const getPagesGrouped = async (req, res) => {
  const result = await moduleService.getPagesGroupedByCategory();

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: { message: result.error },
    });
  }

  return res.json({
    success: true,
    data: result.data,
  });
};

/**
 * Get available pages for a module
 * @route GET /api/rbac/modules/:id/available-pages
 */
export const getAvailablePages = async (req, res) => {
  const { id } = req.params;

  const result = await moduleService.getAvailablePagesForModule(id);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: { message: result.error },
    });
  }

  return res.json({
    success: true,
    data: result.data,
  });
};

/**
 * Add page to module
 * @route POST /api/rbac/modules/:id/pages
 */
export const addPageToModule = async (req, res) => {
  const { id } = req.params;

  const result = await moduleService.addPageToModule(id, req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: { message: result.error },
    });
  }

  return res.status(201).json({
    success: true,
    data: result.data,
    message: result.message,
  });
};

/**
 * Remove page from module
 * @route DELETE /api/rbac/modules/:id/pages/:pageId
 */
export const removePageFromModule = async (req, res) => {
  const { id, pageId } = req.params;

  const result = await moduleService.removePageFromModule(id, pageId);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: { message: result.error },
    });
  }

  return res.json({
    success: true,
    data: result.data,
    message: result.message,
  });
};

/**
 * Update page order in module
 * @route PUT /api/rbac/modules/:id/pages/order
 */
export const updatePageOrder = async (req, res) => {
  const { id } = req.params;
  const { pageOrders } = req.body;

  if (!Array.isArray(pageOrders)) {
    return res.status(400).json({
      success: false,
      error: { message: 'pageOrders must be an array' },
    });
  }

  const result = await moduleService.updatePageOrder(id, pageOrders);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: { message: result.error },
    });
  }

  return res.json({
    success: true,
    data: result.data,
    message: result.message,
  });
};

/**
 * Toggle page active status in module
 * @route PATCH /api/rbac/modules/:id/pages/:pageId/toggle
 */
export const togglePageInModule = async (req, res) => {
  const { id, pageId } = req.params;

  const result = await moduleService.togglePageInModule(id, pageId);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: { message: result.error },
    });
  }

  return res.json({
    success: true,
    data: result.data,
    message: result.message,
  });
};

/**
 * Configure all pages for a module
 * @route PUT /api/rbac/modules/:id/pages
 */
export const configureModulePages = async (req, res) => {
  const { id } = req.params;
  const { pages } = req.body;

  if (!Array.isArray(pages)) {
    return res.status(400).json({
      success: false,
      error: { message: 'Pages must be an array' },
    });
  }

  const result = await moduleService.configureModulePages(id, pages);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: { message: result.error },
    });
  }

  return res.json({
    success: true,
    data: result.data,
    message: result.message,
  });
};

export default {
  getAllModules,
  getModuleStats,
  getMenuStructure,
  getModuleById,
  createModule,
  updateModule,
  deleteModule,
  toggleModuleStatus,
  getAllPages,
  getPagesGrouped,
  getAvailablePages,
  addPageToModule,
  removePageFromModule,
  updatePageOrder,
  togglePageInModule,
  configureModulePages,
};
