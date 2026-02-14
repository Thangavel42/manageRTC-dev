/**
 * RBAC Modules Routes
 * API endpoints for module and page management
 *
 * IMPORTANT: Static routes (like /pages, /stats, /menu) MUST come before
 * dynamic :id routes to ensure proper routing
 */

import express from 'express';
import moduleController from '../../../controllers/rbac/module.controller.js';

const router = express.Router();

// ==================== STATIC ROUTES FIRST ====================
// These MUST come before any :id routes

/**
 * @route   GET /api/rbac/modules/stats
 * @desc    Get module statistics
 * @access  Private
 */
router.get('/stats', moduleController.getModuleStats);

/**
 * @route   GET /api/rbac/modules/menu
 * @desc    Get menu structure for sidebar
 * @access  Private
 */
router.get('/menu', moduleController.getMenuStructure);

/**
 * @route   GET /api/rbac/modules/pages
 * @desc    Get all pages from pages collection
 * @access  Private
 */
router.get('/pages', moduleController.getAllPages);

/**
 * @route   GET /api/rbac/modules/pages/grouped
 * @desc    Get pages grouped by module category
 * @access  Private
 */
router.get('/pages/grouped', moduleController.getPagesGrouped);

/**
 * @route   GET /api/rbac/modules
 * @desc    Get all modules
 * @access  Private
 */
router.get('/', moduleController.getAllModules);

/**
 * @route   POST /api/rbac/modules
 * @desc    Create a new module
 * @access  Private (Admin/Super Admin only)
 */
router.post('/', moduleController.createModule);

// ==================== DYNAMIC :id ROUTES ====================
// These come AFTER static routes

/**
 * @route   GET /api/rbac/modules/:id
 * @desc    Get a single module by ID
 * @access  Private
 */
router.get('/:id', moduleController.getModuleById);

/**
 * @route   GET /api/rbac/modules/:id/available-pages
 * @desc    Get available pages for a module
 * @access  Private
 */
router.get('/:id/available-pages', moduleController.getAvailablePages);

/**
 * @route   PUT /api/rbac/modules/:id
 * @desc    Update a module
 * @access  Private (Admin/Super Admin only)
 */
router.put('/:id', moduleController.updateModule);

/**
 * @route   DELETE /api/rbac/modules/:id
 * @desc    Delete a module (soft delete)
 * @access  Private (Super Admin only)
 */
router.delete('/:id', moduleController.deleteModule);

/**
 * @route   PATCH /api/rbac/modules/:id/toggle-status
 * @desc    Toggle module active status
 * @access  Private (Admin/Super Admin only)
 */
router.patch('/:id/toggle-status', moduleController.toggleModuleStatus);

/**
 * @route   PUT /api/rbac/modules/:id/pages
 * @desc    Configure all pages for a module
 * @access  Private (Admin/Super Admin only)
 */
router.put('/:id/pages', moduleController.configureModulePages);

/**
 * @route   POST /api/rbac/modules/:id/pages
 * @desc    Add page to module
 * @access  Private (Admin/Super Admin only)
 */
router.post('/:id/pages', moduleController.addPageToModule);

/**
 * @route   PUT /api/rbac/modules/:id/pages/order
 * @desc    Update page order in module
 * @access  Private (Admin/Super Admin only)
 */
router.put('/:id/pages/order', moduleController.updatePageOrder);

/**
 * @route   DELETE /api/rbac/modules/:id/pages/:pageId
 * @desc    Remove page from module
 * @access  Private (Admin/Super Admin only)
 */
router.delete('/:id/pages/:pageId', moduleController.removePageFromModule);

/**
 * @route   PATCH /api/rbac/modules/:id/pages/:pageId/toggle
 * @desc    Toggle page active status in module
 * @access  Private (Admin/Super Admin only)
 */
router.patch('/:id/pages/:pageId/toggle', moduleController.togglePageInModule);

export default router;
