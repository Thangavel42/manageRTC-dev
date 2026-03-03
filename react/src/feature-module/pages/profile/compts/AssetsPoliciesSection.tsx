/**
 * Assets & Policies Section Component
 * Read-only display of assigned assets and applicable policies
 * Part of the Profile page tab structure (Phase 4)
 */

import React, { useEffect, useState } from 'react';
import { useProfileExtendedREST, AssetInfo, PolicyInfo } from '../../../../hooks/useProfileExtendedREST';

interface AssetsPoliciesSectionProps {
  myAssets?: AssetInfo[];
  careerHistory?: { policies?: PolicyInfo[] } | null;
}

export const AssetsPoliciesSection: React.FC<AssetsPoliciesSectionProps> = ({
  myAssets: propAssets,
  careerHistory: propCareerHistory,
}) => {
  const { myAssets: hookAssets, careerHistory: hookCareerHistory, fetchMyAssets, fetchCareerHistory, loading } =
    useProfileExtendedREST();

  const [activeTab, setActiveTab] = useState<'assets' | 'policies'>('assets');

  // Use prop if provided, otherwise use hook data
  const displayAssets = propAssets || hookAssets;
  const displayPolicies = propCareerHistory?.policies || hookCareerHistory?.policies;

  useEffect(() => {
    if (!propAssets) {
      fetchMyAssets();
    }
    if (!propCareerHistory) {
      fetchCareerHistory();
    }
  }, [propAssets, propCareerHistory, fetchMyAssets, fetchCareerHistory]);

  return (
    <div>
      {/* Tab Navigation */}
      <ul className="nav nav-tabs nav-tabs-bottom-solid mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'assets' ? 'active' : ''}`}
            onClick={() => setActiveTab('assets')}
          >
            My Assets ({displayAssets?.length || 0})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'policies' ? 'active' : ''}`}
            onClick={() => setActiveTab('policies')}
          >
            Applicable Policies ({displayPolicies?.length || 0})
          </button>
        </li>
      </ul>

      {loading && !displayAssets && !displayPolicies && (
        <div className="text-center py-4">
          <div className="spinner-border spinner-border-sm" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {/* Assets Tab */}
      {activeTab === 'assets' && (
        <div>
          {displayAssets && displayAssets.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Asset Name</th>
                    <th>Category</th>
                    <th>Serial Number</th>
                    <th>Assigned Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayAssets.map((asset) => (
                    <tr key={asset._id}>
                      <td>
                        <div className="d-flex align-items-center">
                          {asset.image && (
                            <img
                              src={asset.image}
                              alt={asset.assetName}
                              className="rounded me-2"
                              style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                            />
                          )}
                          <span className="fw-medium">{asset.assetName}</span>
                        </div>
                      </td>
                      <td>{asset.category || '--'}</td>
                      <td>
                        <code className="bg-light px-2 py-1 rounded">{asset.serialNumber || '--'}</code>
                      </td>
                      <td>{asset.assignedDate ? new Date(asset.assignedDate).toLocaleDateString() : '--'}</td>
                      <td>
                        <span
                          className={`badge ${
                            asset.status === 'assigned'
                              ? 'bg-success'
                              : asset.status === 'returned'
                                ? 'bg-secondary'
                                : asset.status === 'damaged'
                                  ? 'bg-danger'
                                  : 'bg-warning'
                          }`}
                        >
                          {asset.status || 'Unknown'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-5 bg-light rounded">
              <i className="fas fa-box-open fa-3x text-muted mb-3"></i>
              <p className="text-muted mb-0">No assets assigned to you</p>
            </div>
          )}
        </div>
      )}

      {/* Policies Tab */}
      {activeTab === 'policies' && (
        <div>
          {displayPolicies && displayPolicies.length > 0 ? (
            <div className="list-group">
              {displayPolicies.map((policy) => (
                <div key={policy._id} className="list-group-item list-group-item-action">
                  <div className="d-flex w-100 justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <h6 className="mb-1">{policy.name}</h6>
                      {policy.description && (
                        <p className="mb-2 text-muted small">{policy.description}</p>
                      )}
                      <div className="d-flex gap-3 flex-wrap">
                        {policy.category && (
                          <span className="badge bg-light text-dark">
                            <i className="fas fa-folder me-1"></i>
                            {policy.category}
                          </span>
                        )}
                        <span className="badge bg-light text-dark">
                          <i className="fas fa-calendar me-1"></i>
                          {policy.effectiveDate ? new Date(policy.effectiveDate).toLocaleDateString() : '--'}
                        </span>
                        <span
                          className={`badge ${
                            policy.status === 'active' ? 'bg-success' : policy.status === 'draft' ? 'bg-warning' : 'bg-secondary'
                          }`}
                        >
                          {policy.status || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-5 bg-light rounded">
              <i className="fas fa-file-contract fa-3x text-muted mb-3"></i>
              <p className="text-muted mb-0">No policies applicable to you</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AssetsPoliciesSection;
