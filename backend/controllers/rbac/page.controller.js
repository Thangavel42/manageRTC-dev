/**
 * Page Controller
 * Handles HTTP requests for page management
 */

import * as pageService from '../../services/rbac/page.service.js';

/**
 * Get all pages
 */
export async function getAllPages(req, res) {
  const result = await pageService.getAllPages(req.query);
  res.status(result.success ? 200 : 400).json(result);
}

/**
 * Get pages grouped by category
 */
export async function getPagesGroupedByCategory(req, res) {
  const result = await pageService.getPagesGroupedByCategory();
  res.status(result.success ? 200 : 400).json(result);
}

/**
 * Get a single page by ID
 */
export async function getPageById(req, res) {
  const result = await pageService.getPageById(req.params.id);
  res.status(result.success ? 200 : 404).json(result);
}

/**
 * Get pages by module category
 */
export async function getPagesByModule(req, res) {
  const result = await pageService.getPagesByModule(req.params.category);
  res.status(result.success ? 200 : 400).json(result);
}

/**
 * Create a new page
 */
export async function createPage(req, res) {
  const result = await pageService.createPage(req.body, req.user?.id);
  res.status(result.success ? 201 : 400).json(result);
}

/**
 * Update a page
 */
export async function updatePage(req, res) {
  const result = await pageService.updatePage(req.params.id, req.body, req.user?.id);
  res.status(result.success ? 200 : 400).json(result);
}

/**
 * Delete a page
 */
export async function deletePage(req, res) {
  const result = await pageService.deletePage(req.params.id);
  res.status(result.success ? 200 : 404).json(result);
}

/**
 * Toggle page status
 */
export async function togglePageStatus(req, res) {
  const result = await pageService.togglePageStatus(req.params.id);
  res.status(result.success ? 200 : 400).json(result);
}

/**
 * Get page statistics
 */
export async function getPageStats(req, res) {
  const result = await pageService.getPageStats();
  res.status(result.success ? 200 : 400).json(result);
}

/**
 * Batch update page sort orders
 */
export async function updatePageOrders(req, res) {
  const result = await pageService.updatePageOrders(req.body.pageOrders || []);
  res.status(result.success ? 200 : 400).json(result);
}

export default {
  getAllPages,
  getPagesGroupedByCategory,
  getPageById,
  getPagesByModule,
  createPage,
  updatePage,
  deletePage,
  togglePageStatus,
  getPageStats,
  updatePageOrders,
};
