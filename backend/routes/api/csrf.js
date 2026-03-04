/**
 * CSRF Token Routes
 * REST API endpoint for obtaining CSRF tokens
 *
 * SECURITY FIX - Phase 2, Task 2.4
 */

import express from 'express';
import { csrfProtection } from '../../middleware/csrf.js';

const router = express.Router();

/**
 * GET /api/csrf-token
 * Returns CSRF token for client to include in state-changing requests
 * @access Public (but client must have valid session cookie)
 */
router.get('/csrf-token', csrfProtection, (req, res) => {
  res.json({
    success: true,
    data: {
      csrfToken: req.csrfToken()
    },
    message: 'CSRF token generated successfully'
  });
});

export default router;
