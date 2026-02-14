/**
 * Pages API Routes
 * RESTful endpoints for page management
 */

import express from 'express';
import * as pageController from '../../../controllers/rbac/page.controller.js';

const router = express.Router();

// Get all pages with optional filtering
router.get('/', pageController.getAllPages);

// Get pages grouped by category
router.get('/grouped', pageController.getPagesGroupedByCategory);

// Get page statistics
router.get('/stats', pageController.getPageStats);

// Get pages by module category
router.get('/category/:category', pageController.getPagesByModule);

// Get a single page
router.get('/:id', pageController.getPageById);

// Create a new page
router.post('/', pageController.createPage);

// Update a page
router.put('/:id', pageController.updatePage);

// Batch update page sort orders
router.put('/batch/orders', pageController.updatePageOrders);

// Delete a page
router.delete('/:id', pageController.deletePage);

// Toggle page status
router.patch('/:id/toggle-status', pageController.togglePageStatus);

export default router;
