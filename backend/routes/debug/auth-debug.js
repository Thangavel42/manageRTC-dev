/**
 * Debug Routes - For Development Only
 * These routes help diagnose authentication and user role issues
 */

import express from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';

const router = express.Router();

/**
 * @route   GET /api/debug/auth-info
 * @desc    Get raw Clerk token info without backend verification
 * @access  No auth required - for debugging
 *
 * This endpoint helps diagnose:
 * - What token is being sent
 * - What the frontend thinks the user's role is
 * - User metadata from Clerk
 */
router.get('/auth-info', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.json({
        message: 'No Authorization header found',
        hint: 'Make sure you are logged in with Clerk',
        frontendUrl: req.headers.referer || req.headers.origin,
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.json({
        error: 'Invalid Authorization header format',
        expected: 'Bearer <token>',
        received: authHeader.substring(0, 20) + '...',
      });
    }

    const token = authHeader.substring(7);

    // Decode JWT without verification (for debugging only)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return res.json({
        error: 'Invalid JWT format',
        hint: 'JWT should have 3 parts separated by dots',
      });
    }

    // Decode payload
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    return res.json({
      message: 'Token decoded successfully (not verified)',
      tokenPayload: payload,
      userId: payload.sub,
      azp: payload.azp, // Authorized party (who issued the token)
      exp: payload.exp, // Expiration time
      iat: payload.iat, // Issued at
      nbf: payload.nbf, // Not before
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to decode token',
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/debug/clerk-user/:userId
 * @desc    Get user info directly from Clerk
 * @access  No auth required - for debugging
 */
router.get('/clerk-user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await clerkClient.users.getUser(userId);

    return res.json({
      userId: user.id,
      email: user.primaryEmailAddress?.emailAddress,
      publicMetadata: user.publicMetadata,
      privateMetadata: user.privateMetadata,
      unsafeMetadata: user.unsafeMetadata,
      createdAt: user.createdAt,
      lastSignInAt: user.lastSignInAt,
      // Check if user has superadmin role
      isSuperadmin: user.publicMetadata?.role?.toLowerCase() === 'superadmin',
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to fetch user from Clerk',
      message: error.message,
      hint: 'Make sure the userId is correct and you have Clerk API access',
    });
  }
});

export default router;
