/**
 * Unit Tests for Rate Limiting Configuration
 * Tests Phase 2, Task 2.1-2.2
 */

import { describe, test, expect } from '@jest/globals';

describe('Rate Limiting Configuration - Unit Tests', () => {

  describe('Rate Limiter Existence', () => {
    test('should export authLimiter', async () => {
      const { authLimiter } = await import('../../../middleware/rateLimiting.js');
      expect(authLimiter).toBeDefined();
      expect(typeof authLimiter).toBe('function');
    });

    test('should export apiLimiter', async () => {
      const { apiLimiter } = await import('../../../middleware/rateLimiting.js');
      expect(apiLimiter).toBeDefined();
      expect(typeof apiLimiter).toBe('function');
    });

    test('should export exportLimiter', async () => {
      const { exportLimiter } = await import('../../../middleware/rateLimiting.js');
      expect(exportLimiter).toBeDefined();
      expect(typeof exportLimiter).toBe('function');
    });

    test('should export passwordResetLimiter', async () => {
      const { passwordResetLimiter } = await import('../../../middleware/rateLimiting.js');
      expect(passwordResetLimiter).toBeDefined();
      expect(typeof passwordResetLimiter).toBe('function');
    });

    test('should export searchLimiter', async () => {
      const { searchLimiter } = await import('../../../middleware/rateLimiting.js');
      expect(searchLimiter).toBeDefined();
      expect(typeof searchLimiter).toBe('function');
    });

    test('should export uploadLimiter', async () => {
      const { uploadLimiter } = await import('../../../middleware/rateLimiting.js');
      expect(uploadLimiter).toBeDefined();
      expect(typeof uploadLimiter).toBe('function');
    });

    test('should export createCustomLimiter', async () => {
      const { createCustomLimiter } = await import('../../../middleware/rateLimiting.js');
      expect(createCustomLimiter).toBeDefined();
      expect(typeof createCustomLimiter).toBe('function');
    });
  });

  describe('Custom Limiter Creation', () => {
    test('should create custom rate limiter with default options', async () => {
      const { createCustomLimiter } = await import('../../../middleware/rateLimiting.js');

      const customLimiter = createCustomLimiter({});
      expect(customLimiter).toBeDefined();
      expect(typeof customLimiter).toBe('function');
    });

    test('should create custom rate limiter with specific options', async () => {
      const { createCustomLimiter } = await import('../../../middleware/rateLimiting.js');

      const customLimiter = createCustomLimiter({
        windowMs: 30000,  // 30 seconds
        max: 5,
        message: 'Custom rate limit exceeded',
        keyPrefix: 'test'
      });

      expect(customLimiter).toBeDefined();
      expect(typeof customLimiter).toBe('function');
    });
  });

  describe('Rate Limiter Middleware Behavior', () => {
    test('authLimiter should be a middleware function', async () => {
      const { authLimiter } = await import('../../../middleware/rateLimiting.js');

      // Rate limiters are middleware functions (req, res, next)
      expect(authLimiter.length).toBeGreaterThanOrEqual(3);
    });

    test('apiLimiter should be a middleware function', async () => {
      const { apiLimiter } = await import('../../../middleware/rateLimiting.js');
      expect(apiLimiter.length).toBeGreaterThanOrEqual(3);
    });
  });
});
