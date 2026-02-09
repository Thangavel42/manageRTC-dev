/**
 * Development Console Utility
 * Environment-aware console that only outputs in development
 * Replaces direct console.log calls throughout the codebase
 *
 * @module utils/devConsole
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';
const shouldLog = isDevelopment || process.env.DEBUG === 'true';

/**
 * Development-only console - all methods are no-ops in production
 */
const devConsole = {
  /**
   * Log info message (development only)
   * @param {string} message - Message to log
   * @param {...any} args - Additional arguments
   */
  log: (message, ...args) => {
    if (shouldLog) console.log(message, ...args);
  },

  /**
   * Log debug message (development only)
   * @param {string} message - Message to log
   * @param {...any} args - Additional arguments
   */
  debug: (message, ...args) => {
    if (shouldLog) console.debug(message, ...args);
  },

  /**
   * Log info message (development only)
   * @param {string} message - Message to log
   * @param {...any} args - Additional arguments
   */
  info: (message, ...args) => {
    if (shouldLog) console.info(message, ...args);
  },

  /**
   * Log warning message (always logs, even in production)
   * @param {string} message - Message to log
   * @param {...any} args - Additional arguments
   */
  warn: (message, ...args) => {
    console.warn(message, ...args);
  },

  /**
   * Log error message (always logs, even in production)
   * @param {string} message - Message to log
   * @param {...any} args - Additional arguments
   */
  error: (message, ...args) => {
    console.error(message, ...args);
  },

  /**
   * Log table (development only)
   * @param {any} data - Data to display as table
   */
  table: (data) => {
    if (shouldLog) console.table(data);
  },

  /**
   * Log trace (development only)
   * @param {string} label - Trace label
   * @param {string} message - Message
   */
  trace: (label, message) => {
    if (shouldLog) console.trace(label, message);
  },

  /**
   * Assert (development only)
   * @param {boolean} condition - Condition to check
   * @param {any} data - Data to log if assertion fails
   */
  assert: (condition, ...data) => {
    if (shouldLog) console.assert(condition, ...data);
  },

  /**
   * Clear console (development only)
   */
  clear: () => {
    if (shouldLog) console.clear();
  },

  /**
   * Count occurrences (development only)
   * @param {string} label - Label to count
   */
  count: (label) => {
    if (shouldLog) console.count(label);
  },

  /**
   * Count reset (development only)
   * @param {string} label - Label to reset
   */
  countReset: (label) => {
    if (shouldLog) console.countReset(label);
  },

  /**
   * Group (development only)
   * @param {string} label - Group label
   */
  group: (label) => {
    if (shouldLog) console.group(label);
  },

  /**
   * Group collapsed (development only)
   * @param {string} label - Group label
   */
  groupCollapsed: (label) => {
    if (shouldLog) console.groupCollapsed(label);
  },

  /**
   * Group end (development only)
   */
  groupEnd: () => {
    if (shouldLog) console.groupEnd();
  },

  /**
   * Time measurement (development only)
   * @param {string} label - Timer label
   */
  time: (label) => {
    if (shouldLog) console.time(label);
  },

  /**
   * Time end (development only)
   * @param {string} label - Timer label
   */
  timeEnd: (label) => {
    if (shouldLog) console.timeEnd(label);
  },

  /**
   * Dir (development only)
   * @param {any} obj - Object to inspect
   */
  dir: (obj) => {
    if (shouldLog) console.dir(obj, { depth: 2, colors: true });
  },

  /**
   * Check if development mode is active
   * @returns {boolean} True if in development mode
   */
  isDev: () => isDevelopment,

  /**
   * Check if console is enabled
   * @returns {boolean} True if console output is enabled
   */
  isEnabled: () => shouldLog
};

// Development initialization message
if (isDevelopment) {
  devConsole.info('🔧 Development Console Enabled - console methods will output');
} else if (process.env.NODE_ENV === 'production') {
  // Only log this in production (via console.error which always works)
  // This is intentionally kept to show the console is being controlled
  // No output in production for info/debug logs
}

export default devConsole;
