/**
 * Health Check Routes
 * Endpoints for monitoring application health
 */

import express from 'express';
import healthController from '../controllers/health.controller.js';

const router = express.Router();

/**
 * @route   GET /health
 * @desc    Basic health check (fast, no external calls)
 * @access  Public
 */
router.get('/', healthController.basicHealthCheck);

/**
 * @route   GET /health/detailed
 * @desc    Detailed health check with all system information
 * @access  Public
 */
router.get('/detailed', healthController.detailedHealthCheck);

/**
 * @route   GET /health/readiness
 * @desc    Readiness probe for Kubernetes/container orchestration
 * @access  Public
 */
router.get('/readiness', healthController.readinessCheck);

/**
 * @route   GET /health/liveness
 * @desc    Liveness probe for Kubernetes/container orchestration
 * @access  Public
 */
router.get('/liveness', healthController.livenessCheck);

export default router;
