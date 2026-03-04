/**
 * Sanitization Utilities
 * Prevents NoSQL injection and other input-based attacks
 *
 * SECURITY: Critical security module - any changes require security review
 */

/**
 * Escape special regex characters to prevent ReDoS attacks
 * @param {string} str - User input string
 * @returns {string} Escaped string safe for regex
 * @throws {TypeError} If input is not a string
 *
 * @example
 * escapeRegex('test.*') // 'test\\.\\*'
 * escapeRegex('$100')   // '\\$100'
 */
export const escapeRegex = (str) => {
  if (typeof str !== 'string') {
    throw new TypeError('Input must be a string');
  }

  // Escape all regex special characters
  // Characters: . * + ? ^ $ { } ( ) | [ ] \
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Validate that input is a plain string, not an object with MongoDB operators
 * Blocks common NoSQL injection attempts
 *
 * @param {*} input - User input to validate
 * @returns {string} Validated string
 * @throws {Error} If input contains MongoDB operators or is not a string
 *
 * @example
 * validateSearchInput('john doe')           // Valid: 'john doe'
 * validateSearchInput('{"$ne": null}')      // Throws: Invalid search query
 * validateSearchInput({ $where: '...' })    // Throws: Search query must be a string
 */
export const validateSearchInput = (input) => {
  // Check type first
  if (typeof input !== 'string') {
    throw new Error('Search query must be a string');
  }

  // Block common MongoDB operators
  const blockedOperators = [
    '$where',    // JavaScript execution
    '$regex',    // Regex injection
    '$ne',       // Not equal bypass
    '$gt',       // Greater than
    '$lt',       // Less than
    '$gte',      // Greater than or equal
    '$lte',      // Less than or equal
    '$in',       // In array
    '$nin',      // Not in array
    '$exists',   // Field existence
    '$type',     // Type checking
    '$expr',     // Expression evaluation
    '$jsonSchema', // Schema validation bypass
    '$text',     // Text search manipulation
    '$mod',      // Modulo operation
    '$all',      // Array matching
    '$elemMatch', // Element matching
    '$size'      // Array size
  ];

  // Check if input contains any blocked operators
  const inputLower = input.toLowerCase();
  for (const operator of blockedOperators) {
    if (inputLower.includes(operator)) {
      throw new Error(`Invalid search query: MongoDB operator "${operator}" not allowed`);
    }
  }

  // Additional check for JSON-like objects
  if (input.trim().startsWith('{') || input.trim().startsWith('[')) {
    throw new Error('Invalid search query: JSON objects not allowed');
  }

  return input;
};

/**
 * Validate MongoDB ObjectId format
 * Prevents invalid ID injection attempts
 *
 * @param {string} id - ObjectId to validate
 * @returns {boolean} True if valid ObjectId format
 *
 * @example
 * isValidObjectId('507f1f77bcf86cd799439011')  // true
 * isValidObjectId('invalid')                   // false
 * isValidObjectId('{"$ne": null}')             // false
 */
export const isValidObjectId = (id) => {
  if (typeof id !== 'string') {
    return false;
  }

  // MongoDB ObjectId is 24 hex characters
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Sanitize object to prevent NoSQL injection in query filters
 * Removes any keys that start with $ or contain dots
 *
 * @param {Object} obj - Object to sanitize
 * @returns {Object} Sanitized object
 *
 * @example
 * sanitizeQueryObject({ name: 'John', $where: '...' })
 * // Returns: { name: 'John' }
 */
export const sanitizeQueryObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const sanitized = {};

  Object.keys(obj).forEach(key => {
    // Block MongoDB operators (keys starting with $)
    if (key.startsWith('$')) {
      console.warn(`[Security] Blocked MongoDB operator in query: ${key}`);
      return;
    }

    // Block dot notation (could be used for nested injection)
    if (key.includes('.')) {
      console.warn(`[Security] Blocked dot notation in query: ${key}`);
      return;
    }

    // Recursively sanitize nested objects
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      sanitized[key] = sanitizeQueryObject(obj[key]);
    } else {
      sanitized[key] = obj[key];
    }
  });

  return sanitized;
};

/**
 * Validate and sanitize pagination parameters
 * Enforces maximum limits to prevent DoS attacks
 *
 * @param {Object} query - Query parameters object
 * @returns {Object} Sanitized pagination params
 *
 * @example
 * sanitizePaginationParams({ page: '1', limit: '999999' })
 * // Returns: { page: 1, limit: 100 }
 */
export const sanitizePaginationParams = (query) => {
  const MAX_LIMIT = 100;
  const DEFAULT_LIMIT = 20;
  const DEFAULT_PAGE = 1;

  let page = parseInt(query.page) || DEFAULT_PAGE;
  let limit = parseInt(query.limit) || DEFAULT_LIMIT;

  // Enforce minimum values
  if (page < 1) page = DEFAULT_PAGE;
  if (limit < 1) limit = DEFAULT_LIMIT;

  // Enforce maximum limit to prevent DoS
  if (limit > MAX_LIMIT) {
    console.warn(`[Security] Limit ${limit} exceeds maximum ${MAX_LIMIT}, using max`);
    limit = MAX_LIMIT;
  }

  return { page, limit };
};

/**
 * Validate email format
 * Basic validation to prevent obvious malicious input
 *
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
export const isValidEmail = (email) => {
  if (typeof email !== 'string') {
    return false;
  }

  // Basic email regex (not perfect, but good enough for security)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254; // RFC 5321
};

/**
 * Sanitize string to prevent XSS when used in HTML context
 * Note: This is basic sanitization. For rich text, use DOMPurify.
 *
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
export const sanitizeForHTML = (str) => {
  if (typeof str !== 'string') {
    return '';
  }

  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export default {
  escapeRegex,
  validateSearchInput,
  isValidObjectId,
  sanitizeQueryObject,
  sanitizePaginationParams,
  isValidEmail,
  sanitizeForHTML
};
