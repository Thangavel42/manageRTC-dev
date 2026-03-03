/**
 * Training REST API Routes
 * All training management endpoints
 */

import express from 'express';
import { authenticate, requireEmployeeActive } from '../../middleware/auth.js';
import trainingController from '../../controllers/rest/training.controller.js';

const router = express.Router();

// All routes require authentication AND active employee status
router.use(authenticate, requireEmployeeActive);

/**
 * @route   GET /api/trainings
 * @desc    Get all trainings with pagination and filtering
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/', trainingController.getTrainings);

/**
 * @route   GET /api/trainings/type/:type
 * @desc    Get trainings by type
 * @access  Private (All authenticated users)
 */
router.get('/type/:type', trainingController.getTrainingsByType);

/**
 * @route   GET /api/trainings/stats
 * @desc    Get training statistics
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/stats', trainingController.getTrainingStats);

/**
 * @route   GET /api/trainings/:id
 * @desc    Get single training by ID
 * @access  Private (All authenticated users)
 */
router.get('/:id', trainingController.getTrainingById);

/**
 * @route   POST /api/trainings
 * @desc    Create new training
 * @access  Private (Admin, HR, Superadmin)
 */
router.post('/', trainingController.createTraining);

/**
 * @route   PUT /api/trainings/:id
 * @desc    Update training
 * @access  Private (Admin, HR, Superadmin)
 */
router.put('/:id', trainingController.updateTraining);

/**
 * @route   DELETE /api/trainings/:id
 * @desc    Delete training (soft delete)
 * @access  Private (Admin, Superadmin)
 */
router.delete('/:id', trainingController.deleteTraining);

export default router;
