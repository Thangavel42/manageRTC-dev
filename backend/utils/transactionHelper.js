/**
 * MongoDB Transaction Helper
 * Provides utilities for executing operations within MongoDB transactions
 * Ensures data consistency for multi-document operations
 */

import { client } from '../config/db.js';

/**
 * Execute operations within a MongoDB transaction
 * Uses the multi-tenant getTenantCollections() pattern
 * @param {string} companyId - The company ID (used to determine database name)
 * @param {Function} operations - Async function that receives collections and session
 * @returns {Promise<any>} - Result of the operations
 */
export const withTransaction = async (companyId, operations) => {
  const session = client.startSession();

  try {
    session.startTransaction();

    // Use companyId as tenant database name (align with getTenantCollections)
    const db = client.db(companyId);

    // Create collections object with session support
    const collections = {
      employees: db.collection('employees'),
      departments: db.collection('departments'),
      designations: db.collection('designations'),
      leaves: db.collection('leaves'),
      leaveTypes: db.collection('leaveTypes'),
      attendance: db.collection('attendance'),
      overtimeRequests: db.collection('overtimeRequests'),
      timesheets: db.collection('timesheets'),
      promotions: db.collection('promotions'),
      resignation: db.collection('resignation'),
      termination: db.collection('termination'),
      assets: db.collection('assets'),
      projects: db.collection('projects'),
      tasks: db.collection('tasks'),
      clients: db.collection('clients'),
      leads: db.collection('leads'),
      policies: db.collection('policies'),
      holidays: db.collection('holidays'),
      shifts: db.collection('shifts'),
      payroll: db.collection('payroll'),
      training: db.collection('training'),
      users: db.collection('users'),
      // Add other collections as needed
    };

    // Execute operations with collections and session
    const result = await operations(collections, session);

    // Commit transaction if operations succeeded
    await session.commitTransaction();

    return result;
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    throw error;
  } finally {
    // Always end session
    await session.endSession();
  }
};

/**
 * Execute operations within a transaction with retry logic
 * Uses the multi-tenant pattern
 * @param {string} companyId - The company ID
 * @param {Function} operations - Async function that receives collections and session
 * @param {Object} options - Options for the transaction
 * @param {number} options.maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} options.timeout - Transaction timeout in ms (default: 60000)
 * @returns {Promise<any>} - Result of the operations
 */
export const withTransactionRetry = async (companyId, operations, options = {}) => {
  const { maxRetries = 3, timeout = 60000 } = options;
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await withTransaction(companyId, async (collections, session) => {
        // Set timeout for the transaction
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Transaction timeout')), timeout)
        );

        const operationPromise = operations(collections, session);

        return await Promise.race([operationPromise, timeoutPromise]);
      });
    } catch (error) {
      lastError = error;

      // Check if error is transient (TransientTransactionError)
      const isTransientError =
        error.errorLabels &&
        error.errorLabels.includes('TransientTransactionError');

      // Check if error is due to write conflict (WriteConflict)
      const isWriteConflict = error.code === 112; // WriteConflict error code

      if (isTransientError || isWriteConflict) {
        // Exponential backoff before retry
        const delay = Math.pow(2, attempt) * 100; // 100ms, 200ms, 400ms
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // If not a transient error, don't retry
      throw error;
    }
  }

  // All retries exhausted
  throw lastError;
};

/**
 * Execute operations across multiple databases/companies in a transaction
 * Note: This requires a MongoDB sharded cluster or replica set
 * @param {string[]} companyNames - Array of company/database names
 * @param {Function} operations - Async function that receives collections map and session
 * @returns {Promise<any>} - Result of the operations
 */
export const withMultiDatabaseTransaction = async (companyNames, operations) => {
  const session = client.startSession();

  try {
    session.startTransaction();

    // Get collections for all databases with session
    const collectionsMap = {};
    for (const companyName of companyNames) {
      const db = client.db(companyName);
      collectionsMap[companyName] = {
        employees: db.collection('employees'),
        departments: db.collection('departments'),
        leaves: db.collection('leaves'),
        // Add other collections as needed
      };
    }

    // Execute operations with collections map and session
    const result = await operations(collectionsMap, session);

    await session.commitTransaction();

    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

/**
 * Create a transaction context object for passing to functions
 * This allows functions to optionally participate in transactions
 */
export class TransactionContext {
  constructor(session = null) {
    this.session = session;
  }

  /**
   * Check if currently in a transaction
   */
  isInTransaction() {
    return this.session !== null &&
           this.session.inTransaction();
  }

  /**
   * Execute an operation with transaction support
   * @param {Function} operation - Operation to execute
   * @returns {Promise<any>} - Result of the operation
   */
  async execute(operation) {
    if (this.session) {
      return await operation(this.session);
    }
    return await operation();
  }

  /**
   * Get options for MongoDB operations including session
   */
  getOptions(additionalOptions = {}) {
    if (this.session) {
      return { ...additionalOptions, session: this.session };
    }
    return additionalOptions;
  }
}

/**
 * Create a new transaction context from a session
 * @param {ClientSession} session - MongoDB session
 * @returns {TransactionContext} - Transaction context
 */
export const createTransactionContext = (session) => {
  return new TransactionContext(session);
};

/**
 * Execute operations with automatic transaction context management
 * Uses the multi-tenant pattern
 * @param {string} companyId - The company ID
 * @param {Function} operations - Async function that receives TransactionContext
 * @param {Object} options - Options for the transaction
 * @returns {Promise<any>} - Result of the operations
 */
export const withTransactionContext = async (companyId, operations, options = {}) => {
  const { timeout = 60000 } = options;
  const session = client.startSession();

  try {
    session.startTransaction();

    const context = createTransactionContext(session);

    // Get database name from companyId
    const dbName = `manageRTC_${companyId}`;
    const db = client.db(dbName);

    // Create collections object with session support
    const collections = {
      employees: db.collection('employees'),
      departments: db.collection('departments'),
      designations: db.collection('designations'),
      leaves: db.collection('leaves'),
      leaveTypes: db.collection('leaveTypes'),
      attendance: db.collection('attendance'),
      overtimeRequests: db.collection('overtimeRequests'),
      timesheets: db.collection('timesheets'),
      promotions: db.collection('promotions'),
      resignation: db.collection('resignation'),
      termination: db.collection('termination'),
      assets: db.collection('assets'),
      projects: db.collection('projects'),
      tasks: db.collection('tasks'),
      clients: db.collection('clients'),
      leads: db.collection('leads'),
      policies: db.collection('policies'),
      holidays: db.collection('holidays'),
      shifts: db.collection('shifts'),
      payroll: db.collection('payroll'),
      training: db.collection('training'),
      users: db.collection('users'),
    };

    // Execute operations with timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Transaction timeout')), timeout)
    );

    const operationPromise = operations(context, collections);
    const result = await Promise.race([operationPromise, timeoutPromise]);

    await session.commitTransaction();

    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

export default {
  withTransaction,
  withTransactionRetry,
  withMultiDatabaseTransaction,
  withTransactionContext,
  TransactionContext,
  createTransactionContext,
};
