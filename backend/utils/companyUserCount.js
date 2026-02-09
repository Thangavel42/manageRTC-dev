/**
 * Company UserCount Utilities
 *
 * Helper functions to maintain the userCount field on companies
 * when employees are added, removed, or their status changes.
 */

import { getsuperadminCollections } from '../config/db.js';

/**
 * Increment userCount for a company
 * Called when a new active employee is added
 *
 * @param {string} companyId - The company ID
 * @returns {Promise<{done: boolean, userCount?: number, error?: string}>}
 */
export async function incrementCompanyUserCount(companyId) {
  try {
    const { companiesCollection } = getsuperadminCollections();

    const result = await companiesCollection.updateOne(
      { _id: companyId },
      {
        $inc: { userCount: 1 },
        $set: { userCountLastUpdated: new Date() }
      }
    );

    if (result.matchedCount === 0) {
      return { done: false, error: 'Company not found' };
    }

    // Fetch updated count
    const company = await companiesCollection.findOne({ _id: companyId });
    return { done: true, userCount: company?.userCount || 0 };
  } catch (error) {
    console.error(`Error incrementing userCount for company ${companyId}:`, error);
    return { done: false, error: error.message };
  }
}

/**
 * Decrement userCount for a company
 * Called when an active employee is removed or deactivated
 *
 * @param {string} companyId - The company ID
 * @returns {Promise<{done: boolean, userCount?: number, error?: string}>}
 */
export async function decrementCompanyUserCount(companyId) {
  try {
    const { companiesCollection } = getsuperadminCollections();

    const result = await companiesCollection.updateOne(
      { _id: companyId },
      {
        $inc: { userCount: -1 },
        $set: { userCountLastUpdated: new Date() }
      }
    );

    if (result.matchedCount === 0) {
      return { done: false, error: 'Company not found' };
    }

    // Ensure userCount doesn't go below 0
    await companiesCollection.updateOne(
      { _id: companyId, userCount: { $lt: 0 } },
      { $set: { userCount: 0 } }
    );

    // Fetch updated count
    const company = await companiesCollection.findOne({ _id: companyId });
    return { done: true, userCount: Math.max(0, company?.userCount || 0) };
  } catch (error) {
    console.error(`Error decrementing userCount for company ${companyId}:`, error);
    return { done: false, error: error.message };
  }
}

/**
 * Sync userCount for a company from tenant database
 * Recalculates userCount by counting active employees in tenant database
 * Use this to fix discrepancies or for initial setup
 *
 * @param {string} companyId - The company ID
 * @returns {Promise<{done: boolean, userCount?: number, error?: string}>}
 */
export async function syncCompanyUserCount(companyId) {
  try {
    const { getTenantCollections } = await import('../config/db.js');
    const tenantCollections = getTenantCollections(companyId);

    // Count active employees in tenant database
    const actualUserCount = await tenantCollections.employees.countDocuments({
      status: 'Active',
      isDeleted: { $ne: true }
    });

    // Update company document
    const { companiesCollection } = getsuperadminCollections();
    await companiesCollection.updateOne(
      { _id: companyId },
      {
        $set: {
          userCount: actualUserCount,
          userCountLastUpdated: new Date()
        }
      }
    );

    return { done: true, userCount: actualUserCount };
  } catch (error) {
    console.error(`Error syncing userCount for company ${companyId}:`, error);
    return { done: false, error: error.message };
  }
}

/**
 * Batch sync userCount for all companies
 * Useful for periodic reconciliation
 *
 * @returns {Promise<{done: boolean, synced: number, errors: number}>}
 */
export async function syncAllCompanyUserCounts() {
  try {
    const { companiesCollection } = getsuperadminCollections();

    const companies = await companiesCollection.find({}).toArray();

    let synced = 0;
    let errors = 0;

    for (const company of companies) {
      const result = await syncCompanyUserCount(company._id.toString());
      if (result.done) {
        synced++;
      } else {
        errors++;
        console.error(`Failed to sync company ${company._id}:`, result.error);
      }
    }

    return { done: true, synced, errors };
  } catch (error) {
    console.error('Error syncing all company userCounts:', error);
    return { done: false, synced: 0, errors: 0 };
  }
}

export default {
  incrementCompanyUserCount,
  decrementCompanyUserCount,
  syncCompanyUserCount,
  syncAllCompanyUserCounts
};
