/**
 * General helper utilities
 */

import crypto from 'crypto';

/**
 * Generate a unique request ID for audit/tracing purposes
 * @returns {string} A unique request identifier
 */
export const generateRequestId = () => {
  return `req_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
};
